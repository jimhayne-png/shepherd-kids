import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can, isAdminRole } from '@/lib/staff-permissions';
import { getFamilyForChurch } from '@/lib/children-ministry/family-care';

const RELATIONSHIPS = ['parent_guardian', 'grandparent', 'authorized_pickup', 'other_trusted_adult'];
const PICKUP_SCOPES = ['all_children', 'specific_children'];

const MEMBER_SELECT = 'id, first_name, last_name, relationship, phone, email, authorized_pickup, pickup_scope, emergency_contact, notes, created_by, created_by_name, created_at, updated_at';

async function validateChildIds(childIds: string[], familyId: string, churchId: string) {
  if (childIds.length === 0) return false;
  const admin = adminClient();
  const { data } = await admin
    .from('cm_visitor_children')
    .select('id')
    .eq('family_id', familyId)
    .eq('church_id', churchId)
    .in('id', childIds);
  const validIds = new Set((data ?? []).map((c: { id: string }) => c.id));
  return childIds.every(id => validIds.has(id));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const isArchive = body?.archive === true;

  if (isArchive) {
    if (!isAdminRole(auth.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  } else if (!can(auth.role, 'access_children_ministry')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await getFamilyForChurch(id, auth.churchId);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const admin = adminClient();

  if (isArchive) {
    const { data, error } = await admin
      .from('cm_household_members')
      .update({ archived_at: new Date().toISOString(), archived_by: auth.userId })
      .eq('id', memberId)
      .eq('family_id', id)
      .eq('church_id', auth.churchId)
      .select('id');

    if (error) return Response.json({ error: error.message }, { status: 400 });
    if (!data || data.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ ok: true });
  }

  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 });

  const updateData: Record<string, unknown> = {};

  if (typeof body?.firstName === 'string') {
    const v = body.firstName.trim();
    if (!v) return Response.json({ error: 'firstName cannot be empty' }, { status: 400 });
    updateData.first_name = v;
  }
  if (typeof body?.lastName === 'string') {
    const v = body.lastName.trim();
    if (!v) return Response.json({ error: 'lastName cannot be empty' }, { status: 400 });
    updateData.last_name = v;
  }
  if (typeof body?.relationship === 'string') {
    if (!RELATIONSHIPS.includes(body.relationship)) return Response.json({ error: 'Invalid relationship' }, { status: 400 });
    updateData.relationship = body.relationship;
  }
  if ('phone' in body) updateData.phone = body.phone ? String(body.phone).trim() : null;
  if ('email' in body) updateData.email = body.email ? String(body.email).trim() : null;
  if ('notes' in body) updateData.notes = body.notes ? String(body.notes).trim() : null;
  if (typeof body?.emergencyContact === 'boolean') updateData.emergency_contact = body.emergencyContact;

  let childIds: string[] | null = null;
  let pickupScope: string | null = null;

  if (typeof body?.authorizedPickup === 'boolean') {
    const authorizedPickup = body.authorizedPickup;
    updateData.authorized_pickup = authorizedPickup;

    if (authorizedPickup) {
      pickupScope = String(body?.pickupScope ?? '').trim();
      if (!PICKUP_SCOPES.includes(pickupScope)) {
        return Response.json({ error: 'pickupScope is required when authorizedPickup is true' }, { status: 400 });
      }
      updateData.pickup_scope = pickupScope;

      if (pickupScope === 'specific_children') {
        const ids: string[] = Array.isArray(body?.childIds) ? body.childIds.filter((c: unknown) => typeof c === 'string') : [];
        const valid = await validateChildIds(ids, id, auth.churchId);
        if (!valid) return Response.json({ error: 'One or more childIds are invalid for this household' }, { status: 400 });
        childIds = ids;
      } else {
        childIds = [];
      }
    } else {
      updateData.pickup_scope = null;
      childIds = [];
    }
  }

  if (Object.keys(updateData).length === 0 && childIds === null) {
    return Response.json({ error: 'No changes provided' }, { status: 400 });
  }
  if (Object.keys(updateData).length > 0) updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length > 0) {
    const { data, error } = await admin
      .from('cm_household_members')
      .update(updateData)
      .eq('id', memberId)
      .eq('family_id', id)
      .eq('church_id', auth.churchId)
      .select('id');

    if (error) return Response.json({ error: error.message }, { status: 400 });
    if (!data || data.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  }

  if (childIds !== null) {
    await admin.from('cm_household_member_children').delete().eq('household_member_id', memberId);
    if (childIds.length > 0) {
      await admin.from('cm_household_member_children').insert(
        childIds.map(childId => ({ church_id: auth.churchId, household_member_id: memberId, child_id: childId })),
      );
    }
  }

  const { data: updated, error: fetchError } = await admin
    .from('cm_household_members')
    .select(MEMBER_SELECT)
    .eq('id', memberId)
    .single();

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 400 });

  const { data: linkRows } = await admin
    .from('cm_household_member_children')
    .select('child_id')
    .eq('household_member_id', memberId);

  return Response.json({
    member: { ...updated, childIds: (linkRows ?? []).map((r: { child_id: string }) => r.child_id) },
  });
}
