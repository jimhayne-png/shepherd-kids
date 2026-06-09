import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { Resend } from 'resend';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}

async function getChurchId(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.church_id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: visitorId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const admin = adminClient();

  // Get visitor
  const { data: visitor } = await admin
    .from('visitors')
    .select('*')
    .eq('id', visitorId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!visitor) return Response.json({ error: 'Visitor not found' }, { status: 404 });

  // Determine sequence: explicit or best-match
  let sequenceId = body.sequenceId ?? null;
  if (!sequenceId) {
    // Try department match first
    if (visitor.department_id) {
      const { data: deptSeq } = await admin
        .from('visitor_sequences')
        .select('id')
        .eq('church_id', churchId)
        .eq('department_id', visitor.department_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      sequenceId = deptSeq?.id ?? null;
    }
    // Fall back to church-wide default
    if (!sequenceId) {
      const { data: defaultSeq } = await admin
        .from('visitor_sequences')
        .select('id')
        .eq('church_id', churchId)
        .is('department_id', null)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      sequenceId = defaultSeq?.id ?? null;
    }
  }

  if (!sequenceId) return Response.json({ error: 'No active sequence found' }, { status: 404 });

  // Get first step to compute next_step_at
  const { data: firstStep } = await admin
    .from('visitor_sequence_steps')
    .select('id, step_number, day_offset, step_type, email_subject, email_body')
    .eq('sequence_id', sequenceId)
    .order('step_number')
    .limit(1)
    .maybeSingle();

  const nextStepAt = firstStep
    ? new Date(Date.now() + (firstStep.day_offset * 86400000)).toISOString()
    : null;

  // Create enrollment
  const { data: enrollment, error: enrollError } = await admin
    .from('visitor_sequence_enrollments')
    .insert({
      visitor_id: visitorId,
      sequence_id: sequenceId,
      church_id: churchId,
      current_step: firstStep?.step_number ?? 1,
      status: 'active',
      next_step_at: nextStepAt,
    })
    .select('id')
    .single();

  if (enrollError) return Response.json({ error: enrollError.message }, { status: 400 });

  // Update visitor status to in_sequence
  await admin.from('visitors').update({ status: 'in_sequence' }).eq('id', visitorId);

  // If first step has day_offset=0 and is email, send immediately
  if (firstStep && firstStep.day_offset === 0 && firstStep.step_type === 'email' && visitor.email) {
    try {
      const { data: church } = await admin.from('churches').select('name').eq('id', churchId).maybeSingle();
      const resend = new Resend(process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: 'ShepherdKids <onboarding@resend.dev>',
        to: visitor.email,
        subject: firstStep.email_subject ?? `Welcome from ${church?.name ?? 'our church'}!`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
            <div style="background: #1A4A2E; padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 22px; font-weight: normal;">${church?.name ?? 'Our Church'}</h1>
            </div>
            <div style="background: white; padding: 36px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; line-height: 1.7; color: #374151; white-space: pre-wrap;">${firstStep.email_body ?? ''}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
              <p style="font-size: 13px; color: #9ca3af; text-align: center;">Sent via ShepherdKids</p>
            </div>
          </div>
        `,
      });

      await admin.from('visitor_sequence_log').insert({
        enrollment_id: enrollment.id,
        step_id: firstStep.id,
        result: 'sent',
      });

      // Advance to next step
      const { data: nextStep } = await admin
        .from('visitor_sequence_steps')
        .select('id, step_number, day_offset')
        .eq('sequence_id', sequenceId)
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
      await admin.from('visitor_sequence_log').insert({
        enrollment_id: enrollment.id,
        step_id: firstStep.id,
        result: 'failed',
      });
    }
  }

  return Response.json({ success: true, enrollmentId: enrollment.id });
}
