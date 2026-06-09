import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getISOWeek, CURRENT_YEAR } from '@/lib/pastor-touch';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || authHeader.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const year = CURRENT_YEAR;
  const currentWeek = getISOWeek();

  const { data: churches } = await admin.from('churches').select('id, name');
  let totalSent = 0;

  for (const church of churches ?? []) {
    // Get active staff
    const { data: staff } = await admin.from('pastoral_staff').select('*').eq('church_id', church.id).eq('active', true);
    if (!staff?.length) continue;

    // Get admin emails
    const { data: cuList } = await admin.from('church_users').select('user_id').eq('church_id', church.id);
    const adminEmails: string[] = [];
    for (const cu of cuList ?? []) {
      const { data: { user } } = await admin.auth.admin.getUserById(cu.user_id);
      if (user?.email) adminEmails.push(user.email);
    }

    for (const pastor of staff) {
      // Get this week's assignments
      const { data: assignments } = await admin
        .from('annual_pastor_touch_assignments')
        .select('member_id')
        .eq('church_id', church.id)
        .eq('year', year)
        .eq('pastor_id', pastor.id)
        .eq('week_number', currentWeek);

      if (!assignments?.length) continue;

      const memberIds = assignments.map((a: any) => a.member_id);
      const { data: members } = await admin.from('members').select('id, first_name, last_name, phone, address, city, state, zip').in('id', memberIds);
      const { data: logs } = await admin.from('annual_pastor_touch_log').select('member_id, call_done, letter_done, prayer_done').eq('church_id', church.id).eq('year', year).in('member_id', memberIds);
      const logMap: Record<string, any> = {};
      for (const l of logs ?? []) logMap[l.member_id] = l;

      const rows = (members ?? []).map((m: any) => {
        const log = logMap[m.id] ?? {};
        const address = [m.address, [m.city, m.state].filter(Boolean).join(', ')].filter(Boolean).join(', ');
        const touches = [log.call_done ? '✅ Call' : '📞 Call needed', log.letter_done ? '✅ Letter' : '✉️ Letter needed', log.prayer_done ? '✅ Prayer' : '🙏 Prayer needed'].join(' · ');
        return `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:12px 0"><p style="margin:0;font-size:15px;font-weight:500;color:#111827">${m.first_name} ${m.last_name}</p>${m.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280">${m.phone}</p>` : ''}${address ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280">${address}</p>` : ''}</td><td style="padding:12px 0;font-size:13px;color:#6b7280;text-align:right">${touches}</td></tr>`;
      }).join('');

      const incomplete = (members ?? []).filter((m: any) => {
        const log = logMap[m.id] ?? {};
        return !log.call_done || !log.letter_done || !log.prayer_done;
      }).length;

      if (incomplete === 0) continue; // All done, no reminder needed

      const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1f2937"><div style="background:#1A4A2E;padding:28px 32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:22px;font-weight:normal">${church.name}</h1><p style="color:#86efac;margin:6px 0 0;font-size:14px">Annual Pastor Touch — Week ${currentWeek} of 52</p></div><div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><p style="color:#374151;margin:0 0 20px">Hi ${pastor.title ? pastor.title + ' ' : ''}${pastor.name}, here are your ${assignments.length} member${assignments.length !== 1 ? 's' : ''} for this week. ${incomplete} still need${incomplete === 1 ? 's' : ''} follow up.</p><table style="width:100%;border-collapse:collapse">${rows}</table><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:12px;color:#9ca3af;text-align:center">Sent via ShepherdKids Annual Pastor Touch</p></div></div>`;

      // Send to pastor's email, fall back to admin emails
      const recipients = pastor.email ? [pastor.email] : adminEmails;
      if (!recipients.length) continue;

      try {
        await resend.emails.send({
          from: 'ShepherdKids <onboarding@resend.dev>',
          to: recipients,
          subject: `Your Pastor Touch list for Week ${currentWeek} — ${assignments.length} member${assignments.length !== 1 ? 's' : ''}`,
          html,
        });
        totalSent++;
      } catch (_) { /* never block */ }
    }
  }

  return Response.json({ sent: totalSent, week: currentWeek, mode: 'cron' });
}
