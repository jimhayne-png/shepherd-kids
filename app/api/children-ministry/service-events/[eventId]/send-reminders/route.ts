import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { Resend } from 'resend';

function fmtTime(t: string | null) {
  if (!t) return ''; try { const [h, m] = t.split(':'); const d = new Date(); d.setHours(parseInt(h), parseInt(m)); return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch { return t; }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();
  const [eventRes, assignmentsRes, churchRes] = await Promise.all([
    admin.from('cm_service_events').select('*').eq('id', eventId).maybeSingle(),
    admin.from('cm_volunteer_assignments').select('*').eq('event_id', eventId).eq('church_id', churchId).neq('status', 'declined'),
    admin.from('churches').select('name').eq('id', churchId).single(),
  ]);

  const event = eventRes.data;
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
  const churchName = churchRes.data?.name ?? 'Our Church';
  const assignments = assignmentsRes.data ?? [];

  const volIds = assignments.map((a: any) => a.volunteer_id);
  const { data: volunteers } = volIds.length ? await admin.from('cm_volunteers').select('id, first_name, email').in('id', volIds) : { data: [] };
  const volMap: Record<string, any> = {};
  for (const v of volunteers ?? []) volMap[v.id] = v;

  const dateDisplay = new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeDisplay = [fmtTime(event.start_time), fmtTime(event.end_time)].filter(Boolean).join(' – ');
  const resend = new Resend(process.env.RESEND_API_KEY!);
  let sent = 0;

  for (const assignment of assignments) {
    const vol = volMap[assignment.volunteer_id];
    if (!vol?.email) continue;

    try {
      await resend.emails.send({
        from: `${churchName} <onboarding@resend.dev>`,
        to: [vol.email],
        subject: `Reminder: You're scheduled for ${event.title} on ${dateDisplay}`,
        html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1f2937;">
          <div style="background:#F28C28;padding:24px 28px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:20px;font-weight:normal;">${churchName}</h1>
            <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">Volunteer Reminder</p>
          </div>
          <div style="background:white;padding:32px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0 0 16px;font-size:16px;">Hi ${vol.first_name},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">This is a friendly reminder that you're scheduled to serve this week. Thank you!</p>
            <div style="background:#fff7ed;border-left:4px solid #F28C28;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 20px;">
              <p style="margin:0 0 6px;font-weight:bold;color:#9a3412;">${event.title}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#9a3412;">📅 ${dateDisplay}</p>
              ${timeDisplay ? `<p style="margin:0 0 4px;font-size:14px;color:#9a3412;">🕐 ${timeDisplay}</p>` : ''}
              <p style="margin:0;font-size:14px;color:#9a3412;">🎯 Your role: <strong>${assignment.role_name}</strong></p>
            </div>
            ${event.notes ? `<p style="font-size:14px;color:#6b7280;margin:0 0 16px;">Notes: ${event.notes}</p>` : ''}
            <p style="font-size:14px;color:#374151;margin:0;">See you Sunday! If anything comes up, please let us know as soon as possible.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdWell · ${churchName}</p>
          </div></div>`,
      });
      await admin.from('cm_volunteer_assignments').update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() }).eq('id', assignment.id);
      sent++;
    } catch (_) { /* never block */ }
  }

  return Response.json({ sent });
}
