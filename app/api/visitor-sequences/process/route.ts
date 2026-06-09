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

async function processChurch(churchId: string, resend: Resend) {
  const admin = adminClient();
  const now = new Date().toISOString();

  const { data: enrollments } = await admin
    .from('visitor_sequence_enrollments')
    .select('id, visitor_id, sequence_id, current_step, next_step_at')
    .eq('church_id', churchId)
    .eq('status', 'active')
    .lte('next_step_at', now);

  if (!enrollments?.length) return 0;

  const { data: church } = await admin.from('churches').select('name').eq('id', churchId).maybeSingle();
  let processed = 0;

  for (const enrollment of enrollments) {
    const { data: step } = await admin
      .from('visitor_sequence_steps')
      .select('*')
      .eq('sequence_id', enrollment.sequence_id)
      .eq('step_number', enrollment.current_step)
      .maybeSingle();

    if (!step) {
      await admin.from('visitor_sequence_enrollments').update({ status: 'completed' }).eq('id', enrollment.id);
      continue;
    }

    const { data: visitor } = await admin
      .from('visitors')
      .select('first_name, last_name, email')
      .eq('id', enrollment.visitor_id)
      .maybeSingle();

    let result: 'sent' | 'skipped' | 'failed' = 'skipped';

    if (step.step_type === 'email' && visitor?.email) {
      try {
        await resend.emails.send({
          from: 'ShepherdKids <onboarding@resend.dev>',
          to: visitor.email,
          subject: step.email_subject ?? `A message from ${church?.name ?? 'our church'}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
              <div style="background: #1A4A2E; padding: 28px 32px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: normal;">${church?.name ?? 'Our Church'}</h1>
              </div>
              <div style="background: white; padding: 36px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; line-height: 1.7; color: #374151; white-space: pre-wrap;">${step.email_body ?? ''}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
                <p style="font-size: 13px; color: #9ca3af; text-align: center;">Sent via ShepherdKids</p>
              </div>
            </div>
          `,
        });
        result = 'sent';
      } catch (_) {
        result = 'failed';
      }
    } else if (step.step_type === 'task') {
      result = 'sent';
    }

    await admin.from('visitor_sequence_log').insert({
      enrollment_id: enrollment.id,
      step_id: step.id,
      result,
    });

    const { data: nextStep } = await admin
      .from('visitor_sequence_steps')
      .select('step_number, day_offset')
      .eq('sequence_id', enrollment.sequence_id)
      .gt('step_number', step.step_number)
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
      await admin.from('visitors').update({ status: 'converted' }).eq('id', enrollment.visitor_id);
    }

    processed++;
  }

  return processed;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerToken = authHeader.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  // Cron mode: secret matches → process all churches
  if (cronSecret && bearerToken === cronSecret) {
    const admin = adminClient();
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const { data: churches } = await admin.from('churches').select('id');
    let totalProcessed = 0;

    for (const church of churches ?? []) {
      totalProcessed += await processChurch(church.id, resend);
    }

    return Response.json({ processed: totalProcessed, mode: 'cron' });
  }

  // User mode: valid session → process their church only
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const processed = await processChurch(churchId, resend);

  return Response.json({ processed, mode: 'manual' });
}
