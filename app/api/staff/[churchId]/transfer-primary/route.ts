import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can } from '@/lib/staff-permissions';

// POST — transfer Primary Administrator role to another church_admin.
//
// Body:
//   { newPrimaryUserId: string, billingAction: 'keep' | 'update' }
//
// Security model:
//   1. Actor identity — resolved server-side from the Supabase JWT via
//      getAuthContextWithRole(). The browser cannot supply or override ctx.userId.
//   2. Actor church membership — ctx.churchId is derived from church_users via
//      the service-role client; a mismatch with the URL churchId → 401.
//   3. Actor role — checked via can(ctx.role, 'transfer_primary') before the RPC
//      is called. Only primary_admin and church_admin pass.
//   4. RPC independence — transfer_primary_admin() independently locks
//      church_users for the church, verifies the target is a church_admin in
//      the same church, and performs both role updates in one transaction.
//      p_current_user_id is passed for billing audit only; the RPC does not
//      re-verify the actor's role (the API gate is authoritative for that).
//
// The swap is performed inside a single PostgreSQL transaction via the
// transfer_primary_admin() RPC, so no partial state can persist if the
// server crashes between the two role updates.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const ctx = await getAuthContextWithRole(request);
  if (!ctx || ctx.churchId !== churchId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!can(ctx.role, 'transfer_primary')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const newPrimaryUserId = String(body?.newPrimaryUserId ?? '').trim();
  const billingAction    = String(body?.billingAction    ?? 'keep').trim();

  if (!newPrimaryUserId) {
    return Response.json({ error: 'newPrimaryUserId is required.' }, { status: 400 });
  }
  if (!['keep', 'update'].includes(billingAction)) {
    return Response.json({ error: 'billingAction must be "keep" or "update".' }, { status: 400 });
  }
  if (newPrimaryUserId === ctx.userId) {
    return Response.json({ error: 'You are already the Primary Administrator.' }, { status: 400 });
  }

  const admin = adminClient();

  const { data: actorData }  = await admin.auth.admin.getUserById(ctx.userId);
  const { data: targetData } = await admin.auth.admin.getUserById(newPrimaryUserId);
  const actorEmail  = actorData?.user?.email  ?? '';
  const targetEmail = targetData?.user?.email ?? '';

  // Atomic swap via PostgreSQL RPC — both role updates happen in one transaction
  const { data: rpcResult, error: rpcError } = await admin.rpc('transfer_primary_admin', {
    p_church_id:       churchId,
    p_current_user_id: ctx.userId,
    p_new_primary_id:  newPrimaryUserId,
    p_billing_action:  billingAction,
  });

  type RpcResult = { ok?: boolean; error?: string };
  const result = rpcResult as unknown as RpcResult | null;

  if (rpcError) {
    console.error('[transfer-primary] RPC error:', rpcError.message);
    return Response.json({ error: rpcError.message }, { status: 500 });
  }
  if (result?.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  // Audit — transfer
  await admin.from('church_audit_logs').insert({
    church_id:    churchId,
    actor_id:     ctx.userId,
    actor_email:  actorEmail,
    action:       'primary_admin_transferred',
    target_id:    newPrimaryUserId,
    target_email: targetEmail,
    details:      {
      previousPrimaryUserId: ctx.userId,
      previousPrimaryEmail:  actorEmail,
      billingAction,
    },
  });

  // Audit — billing review request (when applicable)
  if (billingAction === 'update') {
    await admin.from('church_audit_logs').insert({
      church_id:    churchId,
      actor_id:     ctx.userId,
      actor_email:  actorEmail,
      action:       'billing_review_requested',
      target_id:    newPrimaryUserId,
      target_email: targetEmail,
      details:      { note: 'Outgoing primary administrator requested payment method update after transfer.' },
    });
  }

  return Response.json({ success: true, billingAction });
}
