import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can, isAdminRole, isPrimaryAdmin } from '@/lib/staff-permissions';

// ── PATCH — change a staff member's role ─────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string; userId: string }> },
) {
  const { churchId, userId } = await params;
  const ctx = await getAuthContextWithRole(request);
  if (!ctx || ctx.churchId !== churchId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!can(ctx.role, 'change_roles')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const newRole = String(body?.role ?? '').trim();

  if (!['church_admin', 'children_staff', 'checkin_staff'].includes(newRole)) {
    return Response.json({ error: 'Invalid role. Cannot assign primary_admin via this endpoint.' }, { status: 400 });
  }

  const admin = adminClient();

  // Fetch the target member's current record
  const { data: target } = await admin
    .from('church_users')
    .select('id, role')
    .eq('church_id', churchId)
    .eq('user_id', userId)
    .maybeSingle();

  type CURow = { id: string; role: string };
  const t = target as unknown as CURow | null;
  if (!t) {
    return Response.json({ error: 'Staff member not found.' }, { status: 404 });
  }

  // Cannot demote the primary_admin via this endpoint — use transfer wizard
  if (isPrimaryAdmin(t.role)) {
    return Response.json(
      { error: 'Cannot change the Primary Administrator role. Use the Transfer Primary Administrator wizard.' },
      { status: 400 }
    );
  }

  // Get actor email for audit log
  const { data: actorData } = await admin.auth.admin.getUserById(ctx.userId);
  const actorEmail = actorData?.user?.email ?? '';
  const { data: targetData } = await admin.auth.admin.getUserById(userId);
  const targetEmail = targetData?.user?.email ?? '';

  const { error } = await admin
    .from('church_users')
    .update({ role: newRole })
    .eq('church_id', churchId)
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await admin.from('church_audit_logs').insert({
    church_id:    churchId,
    actor_id:     ctx.userId,
    actor_email:  actorEmail,
    action:       'role_changed',
    target_id:    userId,
    target_email: targetEmail,
    details:      { previousRole: t.role, newRole },
  });

  return Response.json({ success: true });
}

// ── DELETE — remove a staff member ───────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string; userId: string }> },
) {
  const { churchId, userId } = await params;
  const ctx = await getAuthContextWithRole(request);
  if (!ctx || ctx.churchId !== churchId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!can(ctx.role, 'remove_staff')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = adminClient();

  // Cannot remove yourself
  if (userId === ctx.userId) {
    return Response.json({ error: 'You cannot remove yourself.' }, { status: 400 });
  }

  // Fetch target's record
  const { data: target } = await admin
    .from('church_users')
    .select('id, role')
    .eq('church_id', churchId)
    .eq('user_id', userId)
    .maybeSingle();

  type CURow = { id: string; role: string };
  const t = target as unknown as CURow | null;
  if (!t) {
    return Response.json({ error: 'Staff member not found.' }, { status: 404 });
  }

  // Cannot remove the primary admin — use transfer wizard first
  if (isPrimaryAdmin(t.role)) {
    return Response.json(
      { error: 'Cannot remove the Primary Administrator. Transfer the role first.' },
      { status: 400 }
    );
  }

  // Ensure at least one admin remains after removal
  if (isAdminRole(t.role)) {
    const { data: allAdmins } = await admin
      .from('church_users')
      .select('id')
      .eq('church_id', churchId)
      .in('role', ['primary_admin', 'church_admin', 'admin']);

    type Row = { id: string };
    const adminCount = ((allAdmins ?? []) as unknown as Row[]).length;
    if (adminCount <= 1) {
      return Response.json(
        { error: 'Cannot remove the last administrator. Add another administrator first.' },
        { status: 400 }
      );
    }
  }

  const { data: actorData } = await admin.auth.admin.getUserById(ctx.userId);
  const actorEmail = actorData?.user?.email ?? '';
  const { data: targetData } = await admin.auth.admin.getUserById(userId);
  const targetEmail = targetData?.user?.email ?? '';

  const { error } = await admin
    .from('church_users')
    .delete()
    .eq('church_id', churchId)
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await admin.from('church_audit_logs').insert({
    church_id:    churchId,
    actor_id:     ctx.userId,
    actor_email:  actorEmail,
    action:       'staff_removed',
    target_id:    userId,
    target_email: targetEmail,
    details:      { removedRole: t.role },
  });

  return Response.json({ success: true });
}
