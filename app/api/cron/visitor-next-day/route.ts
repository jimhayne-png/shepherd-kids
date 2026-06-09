import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function localHourForTimezone(utcDate: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(utcDate);
    const h = parts.find(p => p.type === 'hour');
    return h ? parseInt(h.value) % 24 : -1;
  } catch {
    // Fallback: UTC-6 (America/Chicago CDT)
    return (utcDate.getUTCHours() - 6 + 24) % 24;
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || authHeader.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const now = new Date();

  // Yesterday's date
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const { data: churches } = await admin.from('churches').select('id, name');
  let totalSent = 0;

  for (const church of churches ?? []) {
    // Cron runs at 15:00 UTC = 9:00am CST / 10:00am CDT.
    // On Vercel Pro, switch schedule to "0 * * * *" and restore local-hour check.
    // const localHour = localHourForTimezone(now, 'America/Chicago');
    // if (localHour !== 9) continue;

    // Find families from yesterday that haven't received next-day email
    const { data: families } = await admin
      .from('cm_visitor_families')
      .select('*')
      .eq('church_id', church.id)
      .eq('visit_date', yesterdayStr)
      .eq('next_day_sent', false);

    if (!families?.length) continue;

    const familyIds = families.map((f: any) => f.id);
    const { data: allChildren } = await admin
      .from('cm_visitor_children')
      .select('*')
      .in('family_id', familyIds);

    const childMap: Record<string, any[]> = {};
    for (const c of allChildren ?? []) {
      if (!childMap[c.family_id]) childMap[c.family_id] = [];
      childMap[c.family_id].push(c);
    }

    // Get this week's memory verse from parent_updates if available
    const { data: parentUpdate } = await admin
      .from('children_ministry_parent_updates')
      .select('memory_verse')
      .eq('church_id', church.id)
      .gte('session_date', yesterdayStr)
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const memoryVerse = parentUpdate?.memory_verse ?? null;
    const visitDateDisplay = new Date(yesterdayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    for (const family of families) {
      const children = childMap[family.id] ?? [];
      const firstChildName = children[0]?.first_name ?? 'your child';
      const childNames = children.map((c: any) => c.first_name).join(', ') || 'your children';
      const recipients = [family.parent1_email, family.parent2_email].filter(Boolean) as string[];
      if (!recipients.length) {
        await admin.from('cm_visitor_families').update({ next_day_sent: true, next_day_sent_at: now.toISOString() }).eq('id', family.id);
        continue;
      }

      const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#F28C28;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:bold;">${church.name}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Children's Ministry</p>
  </div>
  <div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;font-size:20px;margin:0 0 16px;">We'd love to see ${firstChildName} again this Sunday! 🎉</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${family.parent1_first_name}, thank you so much for joining us ${visitDateDisplay}. It was a blessing to have ${childNames} with us.</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">We hope ${children.length === 1 ? firstChildName : 'the kids'} had a wonderful time and came home excited about what they learned.</p>
    ${memoryVerse ? `
    <div style="background:#fff7ed;border-left:4px solid #F28C28;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:13px;color:#9a3412;font-weight:bold;">📖 This week's memory verse:</p>
      <p style="margin:0;font-size:15px;color:#9a3412;font-style:italic;">"${memoryVerse}"</p>
      <p style="margin:6px 0 0;font-size:12px;color:#9a3412;">Ask ${firstChildName} if they can recite it!</p>
    </div>` : ''}
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">We would love to make ${church.name} your family's church home. We meet every Sunday — we'd be overjoyed to see you again!</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">With love,<br><strong>${church.name} Children's Ministry</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdKids</p>
  </div>
</div>`;

      try {
        await resend.emails.send({
          from: `${church.name} <onboarding@resend.dev>`,
          to: recipients,
          subject: `We'd love to see ${firstChildName} again this Sunday! 🎉`,
          html,
        });
        totalSent++;
      } catch (_) { /* never block */ }

      await admin.from('cm_visitor_families').update({
        next_day_sent: true,
        next_day_sent_at: now.toISOString(),
      }).eq('id', family.id);
    }
  }

  return Response.json({ sent: totalSent, hour_checked: now.getUTCHours(), mode: 'cron' });
}
