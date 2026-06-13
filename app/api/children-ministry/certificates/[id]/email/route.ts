/**
 * Certificate email API
 *
 * POST /api/children-ministry/certificates/[id]/email
 *
 * Body:
 *   send_now?:        boolean  — mark as sent immediately (stubbed delivery)
 *   schedule_for?:    string   — ISO timestamp to schedule delivery
 *   force?:           boolean  — bypass not-presented guard (with user acknowledgement)
 *
 * Email delivery is STUBBED. When ready, replace the stub block below with a
 * Resend call following the pattern in parents/[id]/send-email/route.ts.
 * The scheduled_for timestamp should be processed by a cron job.
 */

import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const { send_now, schedule_for, force } = await req.json();

  const admin = adminClient();
  const { data: cert } = await admin
    .from('cm_certificates')
    .select('status, parent_email')
    .eq('id', id)
    .eq('church_id', churchId)
    .single();

  if (!cert) return Response.json({ error: 'Not found' }, { status: 404 });

  // Guard: require Presented status (or explicit force override from UI warning)
  const allowedStatuses = ['presented', 'email_scheduled', 'email_sent'];
  if (!allowedStatuses.includes(cert.status) && !force) {
    return Response.json(
      { error: 'not_presented', message: 'Certificate has not been marked as Presented.' },
      { status: 422 },
    );
  }

  if (!cert.parent_email) {
    return Response.json({ error: 'No parent email on this certificate' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // ── Send now (delivery stubbed) ──────────────────────────────────────────────
  if (send_now) {
    // STUB: replace this block with a Resend call when email delivery is ready.
    // See app/api/children-ministry/parents/[id]/send-email/route.ts for pattern.
    await admin
      .from('cm_certificates')
      .update({ status: 'email_sent', parent_email_sent_at: now, updated_at: now })
      .eq('id', id)
      .eq('church_id', churchId);

    return Response.json({
      success: true,
      stubbed: true,
      note: 'Delivery is stubbed — status set to email_sent. Wire Resend here when ready.',
    });
  }

  // ── Schedule for later ───────────────────────────────────────────────────────
  const scheduledFor = schedule_for ? new Date(schedule_for).toISOString() : null;

  await admin
    .from('cm_certificates')
    .update({
      status: 'email_scheduled',
      parent_email_scheduled_at: now,
      email_scheduled_for:       scheduledFor,
      updated_at:                now,
    })
    .eq('id', id)
    .eq('church_id', churchId);

  return Response.json({ success: true, scheduled_for: scheduledFor });
}
