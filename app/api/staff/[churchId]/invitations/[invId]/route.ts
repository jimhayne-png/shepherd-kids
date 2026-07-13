import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can } from '@/lib/staff-permissions';

// DELETE — revoke a pending invitation ───────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string; invId: string }> },
) {
  const { churchId, invId } = await params;
  const ctx = await getAuthContextWithRole(request);
  if (!ctx || ctx.churchId !== churchId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!can(ctx.role, 'revoke_invitation')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = adminClient();

  const { data: inv } = await admin
    .from('church_staff_invitations')
    .select('id, email, status')
    .eq('id', invId)
    .eq('church_id', churchId)
    .maybeSingle();

  type InvRow = { id: string; email: string; status: string };
  const i = inv as unknown as InvRow | null;
  if (!i) {
    return Response.json({ error: 'Invitation not found.' }, { status: 404 });
  }
  if (i.status !== 'pending') {
    return Response.json({ error: 'Only pending invitations can be revoked.' }, { status: 400 });
  }

  const { error } = await admin
    .from('church_staff_invitations')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', invId)
    .eq('church_id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: actorData } = await admin.auth.admin.getUserById(ctx.userId);
  await admin.from('church_audit_logs').insert({
    church_id:    churchId,
    actor_id:     ctx.userId,
    actor_email:  actorData?.user?.email ?? '',
    action:       'invitation_revoked',
    target_email: i.email,
    details:      { invitationId: invId },
  });

  return Response.json({ success: true });
}
