import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can, isAdminRole } from '@/lib/staff-permissions';
import { getFamilyForChurch, getActorName } from '@/lib/children-ministry/family-care';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(auth.role, 'access_children_ministry')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await getFamilyForChurch(id, auth.churchId);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const admin = adminClient();

  const { data: assignment } = await admin
    .from('cm_family_leader_assignments')
    .select('id, leader_user_id, leader_name, assigned_by, assigned_by_name, assigned_at')
    .eq('family_id', id)
    .eq('church_id', auth.churchId)
    .maybeSingle();

  const { data: cuRows } = await admin
    .from('church_users')
    .select('user_id, role')
    .eq('church_id', auth.churchId);

  type CURow = { user_id: string; role: string };
  const eligibleRows = ((cuRows ?? []) as unknown as CURow[]).filter(r => can(r.role, 'access_children_ministry'));

  let eligibleStaff: { userId: string; name: string; role: string }[] = [];
  if (eligibleRows.length > 0) {
    const { data: usersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map((usersPage?.users ?? []).map(u => [u.id, u]));
    eligibleStaff = eligibleRows.map(r => {
      const au = authMap.get(r.user_id);
      const meta = au?.user_metadata as Record<string, string> | null;
      return {
        userId: r.user_id,
        name: meta?.full_name ?? au?.email ?? 'Unknown',
        role: r.role,
      };
    });
  }

  return Response.json({ assignment: assignment ?? null, eligibleStaff });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(auth.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await getFamilyForChurch(id, auth.churchId);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const leaderUserId = String(body?.leaderUserId ?? '').trim();
  if (!leaderUserId) return Response.json({ error: 'leaderUserId is required' }, { status: 400 });

  const admin = adminClient();

  const { data: cu } = await admin
    .from('church_users')
    .select('user_id, role')
    .eq('church_id', auth.churchId)
    .eq('user_id', leaderUserId)
    .maybeSingle();

  type CURow = { user_id: string; role: string };
  const cuRow = cu as unknown as CURow | null;
  if (!cuRow || !can(cuRow.role, 'access_children_ministry')) {
    return Response.json({ error: 'Selected user is not an eligible ministry staff member for this church.' }, { status: 400 });
  }

  const leaderName = await getActorName(leaderUserId);
  const actorName = await getActorName(auth.userId);

  const { data, error } = await admin
    .from('cm_family_leader_assignments')
    .upsert({
      church_id: auth.churchId,
      family_id: id,
      leader_user_id: leaderUserId,
      leader_name: leaderName,
      assigned_by: auth.userId,
      assigned_by_name: actorName,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'family_id' })
    .select('id, leader_user_id, leader_name, assigned_by, assigned_by_name, assigned_at')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ assignment: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(auth.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await getFamilyForChurch(id, auth.churchId);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const { error } = await adminClient()
    .from('cm_family_leader_assignments')
    .delete()
    .eq('family_id', id)
    .eq('church_id', auth.churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
