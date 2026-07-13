import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { isAdminRole } from '@/lib/staff-permissions';

// POST — mark billing review as complete.
// Both primary_admin and church_admin may clear this flag, consistent with their
// full billing access. Lower roles (children_staff, checkin_staff) are rejected.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const ctx = await getAuthContextWithRole(request);
  if (!ctx || ctx.churchId !== churchId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(ctx.role)) {
    return Response.json({ error: 'Only administrators can complete the billing review.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.action !== 'complete') {
    return Response.json({ error: 'action must be "complete".' }, { status: 400 });
  }

  const admin = adminClient();

  const { error } = await admin
    .from('church_subscriptions')
    .update({
      billing_review_required:     false,
      billing_review_requested_at: null,
      billing_review_requested_by: null,
      billing_review_reason:       null,
    })
    .eq('church_id', churchId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { data: actorData } = await admin.auth.admin.getUserById(ctx.userId);
  const actorEmail = actorData?.user?.email ?? '';

  await admin.from('church_audit_logs').insert({
    church_id:   churchId,
    actor_id:    ctx.userId,
    actor_email: actorEmail,
    action:      'billing_review_completed',
    details:     { role: ctx.role, note: 'Administrator confirmed billing review complete.' },
  });

  return Response.json({ success: true });
}
