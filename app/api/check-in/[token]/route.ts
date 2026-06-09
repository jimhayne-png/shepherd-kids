import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function autoEnrollVisitor(churchId: string, visitorId: string, email: string) {
  const admin = adminClient();
  // Find church-wide default active sequence
  const { data: seq } = await admin
    .from('visitor_sequences')
    .select('id')
    .eq('church_id', churchId)
    .is('department_id', null)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (!seq) return;

  const { data: firstStep } = await admin
    .from('visitor_sequence_steps')
    .select('id, step_number, day_offset, step_type, email_subject, email_body')
    .eq('sequence_id', seq.id)
    .order('step_number')
    .limit(1)
    .maybeSingle();

  const { data: enrollment } = await admin
    .from('visitor_sequence_enrollments')
    .insert({
      visitor_id: visitorId,
      sequence_id: seq.id,
      church_id: churchId,
      current_step: firstStep?.step_number ?? 1,
      status: 'active',
      next_step_at: firstStep
        ? new Date(Date.now() + firstStep.day_offset * 86400000).toISOString()
        : null,
    })
    .select('id')
    .single();

  await admin.from('visitors').update({ status: 'in_sequence' }).eq('id', visitorId);

  if (enrollment && firstStep && firstStep.day_offset === 0 && firstStep.step_type === 'email') {
    try {
      const { data: church } = await admin.from('churches').select('name').eq('id', churchId).maybeSingle();
      const resend = new Resend(process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: 'ShepherdKids <onboarding@resend.dev>',
        to: email,
        subject: firstStep.email_subject ?? `Welcome from ${church?.name ?? 'our church'}!`,
        html: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto"><div style="background:#1A4A2E;padding:28px 32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:22px;font-weight:normal">${church?.name ?? 'Our Church'}</h1></div><div style="background:white;padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><p style="font-size:16px;line-height:1.7;color:#374151;white-space:pre-wrap">${firstStep.email_body ?? ''}</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"/><p style="font-size:13px;color:#9ca3af;text-align:center">Sent via ShepherdKids</p></div></div>`,
      });
      await admin.from('visitor_sequence_log').insert({ enrollment_id: enrollment.id, step_id: firstStep.id, result: 'sent' });
      const { data: nextStep } = await admin
        .from('visitor_sequence_steps')
        .select('step_number, day_offset')
        .eq('sequence_id', seq.id)
        .gt('step_number', firstStep.step_number)
        .order('step_number')
        .limit(1)
        .maybeSingle();
      if (nextStep) {
        await admin.from('visitor_sequence_enrollments').update({
          current_step: nextStep.step_number,
          next_step_at: new Date(Date.now() + nextStep.day_offset * 86400000).toISOString(),
        }).eq('id', enrollment.id);
      } else {
        await admin.from('visitor_sequence_enrollments').update({ status: 'completed' }).eq('id', enrollment.id);
        await admin.from('visitors').update({ status: 'converted' }).eq('id', visitorId);
      }
    } catch (_) {
      await admin.from('visitor_sequence_log').insert({ enrollment_id: enrollment.id, step_id: firstStep.id, result: 'failed' });
    }
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const admin = adminClient();
  const { data: event } = await admin
    .from('attendance_events')
    .select('id, name, event_date, is_open, church_id')
    .eq('check_in_token', token)
    .maybeSingle();

  if (!event) return Response.json({ error: 'Invalid check-in link' }, { status: 404 });
  if (!event.is_open) return Response.json({ error: 'Check-in is closed for this event' }, { status: 403 });

  const { data: church } = await admin
    .from('churches')
    .select('name')
    .eq('id', event.church_id)
    .maybeSingle();

  return Response.json({
    name: event.name,
    event_date: event.event_date,
    church_name: church?.name ?? 'Your Church',
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const admin = adminClient();
  const { data: event } = await admin
    .from('attendance_events')
    .select('id, is_open, church_id')
    .eq('check_in_token', token)
    .maybeSingle();

  if (!event) return Response.json({ error: 'Invalid check-in link' }, { status: 404 });
  if (!event.is_open) return Response.json({ error: 'Check-in is closed' }, { status: 403 });

  const body = await request.json();
  const { firstName, lastName, email } = body;

  const guestName = `${firstName?.trim() ?? ''} ${lastName?.trim() ?? ''}`.trim();
  if (!guestName) return Response.json({ error: 'Name is required' }, { status: 400 });

  const { error } = await admin.from('attendance_records').insert({
    attendance_event_id: event.id,
    church_id: event.church_id,
    guest_name: guestName,
    guest_email: email?.trim() || null,
    checked_in_by: 'self',
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Auto-create visitor record and enroll if email provided
  if (email?.trim()) {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      // Find or create visitor
      const { data: existing } = await admin
        .from('visitors')
        .select('id')
        .eq('church_id', event.church_id)
        .eq('email', trimmedEmail)
        .maybeSingle();

      let visitorId = existing?.id ?? null;
      if (!visitorId) {
        const nameParts = guestName.split(' ');
        const firstName = nameParts[0] ?? guestName;
        const lastName = nameParts.slice(1).join(' ') || '';
        const { data: newVisitor } = await admin
          .from('visitors')
          .insert({
            church_id: event.church_id,
            first_name: firstName,
            last_name: lastName,
            email: trimmedEmail,
            visit_date: new Date().toISOString().slice(0, 10),
            source: 'qr',
            status: 'new',
          })
          .select('id')
          .single();
        visitorId = newVisitor?.id ?? null;
      }

      if (visitorId) {
        // Only enroll if not already in a sequence
        const { data: existingEnroll } = await admin
          .from('visitor_sequence_enrollments')
          .select('id')
          .eq('visitor_id', visitorId)
          .eq('status', 'active')
          .maybeSingle();
        if (!existingEnroll) {
          await autoEnrollVisitor(event.church_id, visitorId, trimmedEmail);
        }
      }
    } catch (_) {
      // Visitor creation never blocks check-in
    }
  }

  return Response.json({ success: true });
}
