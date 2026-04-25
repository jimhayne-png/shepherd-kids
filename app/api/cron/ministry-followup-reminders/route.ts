import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { MINISTRY_CONFIG } from '@/lib/ministry-config';
import { getCurrentPeriod, getPeriodLabel } from '../../../ministry/[type]/followup/route';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerToken = authHeader.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || bearerToken !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Get all churches
  const { data: churches } = await admin.from('churches').select('id, name');
  let totalSent = 0;

  for (const church of churches ?? []) {
    // Get all followup settings for this church
    const { data: allSettings } = await admin
      .from('ministry_followup_settings')
      .select('*')
      .eq('church_id', church.id);

    // Also send for ministry types with active rosters but no settings (use defaults)
    const { data: activeRosters } = await admin
      .from('ministry_rosters')
      .select('ministry_type')
      .eq('church_id', church.id)
      .eq('status', 'active');

    const activeTypes = [...new Set((activeRosters ?? []).map((r: any) => r.ministry_type))] as string[];
    if (!activeTypes.length) continue;

    // Get admin emails
    const { data: cuList } = await admin.from('church_users').select('user_id').eq('church_id', church.id);
    const adminEmails: string[] = [];
    for (const cu of cuList ?? []) {
      const { data: { user } } = await admin.auth.admin.getUserById(cu.user_id);
      if (user?.email) adminEmails.push(user.email);
    }
    if (!adminEmails.length) continue;

    const settingsMap: Record<string, any> = {};
    for (const s of allSettings ?? []) settingsMap[s.ministry_type] = s;

    // Previous period — for the "last period" status summary
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    for (const type of activeTypes) {
      const cfg = MINISTRY_CONFIG[type];
      const settings = settingsMap[type] ?? { frequency: 'monthly', touch1_label: 'Phone Call', touch2_label: 'Personal Letter', touch3_label: 'Personal Visit' };
      const period = settings.frequency === 'bimonthly'
        ? { year: prevYear, month: Math.ceil(prevMonth / 2) }
        : { year: prevYear, month: prevMonth };
      const periodLabel = getPeriodLabel(settings.frequency, period.year, period.month);

      const { data: roster } = await admin
        .from('ministry_rosters')
        .select('member_id')
        .eq('church_id', church.id)
        .eq('ministry_type', type)
        .eq('status', 'active');

      const memberIds = (roster ?? []).map((r: any) => r.member_id);
      if (!memberIds.length) continue;

      const { data: members } = await admin.from('members').select('id, first_name, last_name').in('id', memberIds);
      const { data: logs } = await admin.from('ministry_followup_log').select('*').eq('church_id', church.id).eq('ministry_type', type).eq('period_year', period.year).eq('period_month', period.month).in('member_id', memberIds);

      const logMap: Record<string, any> = {};
      for (const l of logs ?? []) logMap[l.member_id] = l;

      const rows = (members ?? []).map((m: any) => {
        const log = logMap[m.id] ?? {};
        const done = [log.touch1_completed, log.touch2_completed, log.touch3_completed].filter(Boolean).length;
        return { name: `${m.first_name} ${m.last_name}`, done };
      }).sort((a: any, b: any) => a.name.localeCompare(b.name));

      const tableRows = rows.map(r =>
        `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;font-size:15px;color:#111827;">${r.name}</td><td style="padding:10px 0;text-align:right;font-size:14px;color:${r.done === 3 ? '#22c55e' : r.done > 0 ? '#f59e0b' : '#9ca3af'}">${r.done === 3 ? '✅ Complete' : r.done > 0 ? `🟡 ${r.done}/3 touches` : '⬜ Not started'}</td></tr>`
      ).join('');

      const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1f2937"><div style="background:#1A4A2E;padding:28px 32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:22px;font-weight:normal">${church.name}</h1><p style="color:#86efac;margin:6px 0 0;font-size:14px">${cfg?.name ?? type} Follow Up Reminder</p></div><div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="color:#1A4A2E;font-size:18px;margin:0 0 6px">Last Period: ${periodLabel}</h2><p style="color:#6b7280;font-size:14px;margin:0 0 24px">It's a new month. Here's where the team stood last period.</p><table style="width:100%;border-collapse:collapse">${tableRows}</table><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:12px;color:#9ca3af;text-align:center">Sent via ShepherdWell</p></div></div>`;

      try {
        await resend.emails.send({
          from: 'ShepherdWell <onboarding@resend.dev>',
          to: adminEmails,
          subject: `${cfg?.name ?? type} Follow Up Reminder — ${periodLabel}`,
          html,
        });
        totalSent++;
      } catch (_) { /* never block */ }
    }
  }

  return Response.json({ sent: totalSent, mode: 'cron' });
}
