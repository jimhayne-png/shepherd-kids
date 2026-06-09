import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { Resend } from 'resend';

function fmtTime(t: string | null) {
  if (!t) return '';
  try { const [h, m] = t.split(':'); const d = new Date(); d.setHours(parseInt(h), parseInt(m)); return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch { return t; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const admin = adminClient();
  const { data: assignments, error } = await admin.from('cm_volunteer_assignments').select('*').eq('event_id', eventId).eq('church_id', churchId).order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const volIds = (assignments ?? []).map((a: any) => a.volunteer_id);
  const { data: volunteers } = volIds.length ? await admin.from('cm_volunteers').select('id, first_name, last_name, email, phone, reliability_score').in('id', volIds) : { data: [] };
  const volMap: Record<string, any> = {};
  for (const v of volunteers ?? []) volMap[v.id] = v;

  const enriched = (assignments ?? []).map((a: any) => ({ ...a, volunteer: volMap[a.volunteer_id] ?? null }));
  return Response.json({ assignments: enriched });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const { volunteer_id, role_name } = await req.json();
  if (!volunteer_id || !role_name) return Response.json({ error: 'volunteer_id and role_name required' }, { status: 400 });

  const admin = adminClient();

  // Check availability (warn only — do not block)
  const { data: event } = await admin.from('cm_service_events').select('*').eq('id', eventId).maybeSingle();
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const { data: unavail } = await admin.from('cm_volunteer_availability').select('id, reason').eq('volunteer_id', volunteer_id).eq('unavailable_date', event.event_date).maybeSingle();

  const { data: assignment, error } = await admin.from('cm_volunteer_assignments').insert({
    church_id: churchId, event_id: eventId, volunteer_id, role_name,
  }).select('*').single();

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Volunteer already assigned to this event' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 400 });
  }

  // Send confirmation email
  const { data: volunteer } = await admin.from('cm_volunteers').select('first_name, last_name, email').eq('id', volunteer_id).maybeSingle();
  const { data: church } = await admin.from('churches').select('name').eq('id', churchId).single();
  const churchName = church?.name ?? 'Our Church';

  if (volunteer?.email && process.env.RESEND_API_KEY) {
    try {
      const dateDisplay = new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const timeDisplay = [fmtTime(event.start_time), fmtTime(event.end_time)].filter(Boolean).join(' – ');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${churchName} <onboarding@resend.dev>`,
        to: [volunteer.email],
        subject: `You're scheduled: ${event.title} — ${dateDisplay}`,
        html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1f2937;">
          <div style="background:#F28C28;padding:24px 28px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:20px;font-weight:normal;">${churchName}</h1>
            <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">Children's Ministry Volunteer Schedule</p>
          </div>
          <div style="background:white;padding:32px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0 0 16px;font-size:16px;">Hi ${volunteer.first_name},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">You've been scheduled to serve in Children's Ministry. Thank you so much!</p>
            <div style="background:#fff7ed;border-left:4px solid #F28C28;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 20px;">
              <p style="margin:0 0 6px;font-weight:bold;color:#9a3412;">${event.title}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#9a3412;">📅 ${dateDisplay}</p>
              ${timeDisplay ? `<p style="margin:0 0 4px;font-size:14px;color:#9a3412;">🕐 ${timeDisplay}</p>` : ''}
              <p style="margin:0;font-size:14px;color:#9a3412;">🎯 Role: <strong>${role_name}</strong></p>
            </div>
            ${event.notes ? `<p style="font-size:14px;color:#6b7280;margin:0 0 16px;">Notes: ${event.notes}</p>` : ''}
            <p style="font-size:14px;color:#374151;margin:0;">Thank you for serving! If you have any questions, please reach out to the Children's Ministry team.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Sent via ShepherdKids · ${churchName}</p>
          </div></div>`,
      });
      await admin.from('cm_volunteer_assignments').update({ confirmation_sent: true }).eq('id', assignment.id);
    } catch (_) { /* never block */ }
  }

  return Response.json({
    assignment: { ...assignment, volunteer: volunteer ?? null },
    availability_warning: unavail ? `${volunteer?.first_name ?? 'Volunteer'} marked unavailable — reason: ${unavail.reason ?? 'no reason given'}` : null,
  });
}
