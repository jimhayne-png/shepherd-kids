import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtTime(t: string | null) {
  if (!t) return ''; try { const [h, m] = t.split(':'); const d = new Date(); d.setHours(parseInt(h), parseInt(m)); return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch { return t; }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || authHeader.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // Find all scheduled events in the next 7 days across all churches
  const { data: events } = await admin
    .from('cm_service_events')
    .select('*')
    .eq('status', 'scheduled')
    .gte('event_date', today)
    .lte('event_date', in7Days);

  if (!events?.length) return Response.json({ sent: 0, mode: 'cron' });

  const eventIds = events.map((e: any) => e.id);
  const { data: assignments } = await admin
    .from('cm_volunteer_assignments')
    .select('*')
    .in('event_id', eventIds)
    .eq('reminder_sent', false)
    .neq('status', 'declined');

  if (!assignments?.length) return Response.json({ sent: 0, mode: 'cron' });

  const volIds = [...new Set(assignments.map((a: any) => a.volunteer_id))];
  const { data: volunteers } = await admin.from('cm_volunteers').select('id, first_name, email').in('id', volIds);
  const volMap: Record<string, any> = {};
  for (const v of volunteers ?? []) volMap[v.id] = v;

  const eventMap: Record<string, any> = {};
  for (const e of events) eventMap[e.id] = e;

  // Get church names
  const churchIds = [...new Set(events.map((e: any) => e.church_id))];
  const { data: churches } = await admin.from('churches').select('id, name').in('id', churchIds);
  const churchMap: Record<string, string> = {};
  for (const c of churches ?? []) churchMap[c.id] = c.name;

  let totalSent = 0;

  for (const assignment of assignments) {
    const vol = volMap[assignment.volunteer_id];
    const event = eventMap[assignment.event_id];
    if (!vol?.email || !event) continue;

    const churchName = churchMap[event.church_id] ?? 'Our Church';
    const timeDisplay = [fmtTime(event.start_time), fmtTime(event.end_time)].filter(Boolean).join(' – ');

    try {
      await resend.emails.send({
        from: `${churchName} <onboarding@resend.dev>`,
        to: [vol.email],
        subject: `Reminder: You're scheduled for ${event.title} on ${fmtDate(event.event_date)}`,
        html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1f2937;">
          <div style="background:#F28C28;padding:24px 28px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:20px;font-weight:normal;">${churchName}</h1>
            <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">Volunteer Reminder</p>
          </div>
          <div style="background:white;padding:32px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="font-size:15px;margin:0 0 16px;">Hi ${vol.first_name}, this is your weekly volunteer reminder:</p>
            <div style="background:#fff7ed;border-left:4px solid #F28C28;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 20px;">
              <p style="margin:0 0 6px;font-weight:bold;color:#9a3412;">${event.title}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#9a3412;">📅 ${fmtDate(event.event_date)}</p>
              ${timeDisplay ? `<p style="margin:0 0 4px;font-size:14px;color:#9a3412;">🕐 ${timeDisplay}</p>` : ''}
              <p style="margin:0;font-size:14px;color:#9a3412;">🎯 Your role: <strong>${assignment.role_name}</strong></p>
            </div>
            <p style="font-size:14px;color:#374151;margin:0;">Thank you for serving!</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdKids</p>
          </div></div>`,
      });
      await admin.from('cm_volunteer_assignments').update({ reminder_sent: true, reminder_sent_at: now.toISOString() }).eq('id', assignment.id);
      totalSent++;
    } catch (_) { /* never block */ }
  }

  return Response.json({ sent: totalSent, mode: 'cron' });
}
