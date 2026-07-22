import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can, isAdminRole } from '@/lib/staff-permissions';
import { getFamilyForChurch } from '@/lib/children-ministry/family-care';
import { syncPickupForMember } from '@/lib/children-ministry/pickup-sync';
import { setHouseholdEmergencyContact } from '@/lib/children-ministry/emergency-contact';

const RELATIONSHIPS = ['parent_guardian', 'grandparent', 'authorized_pickup', 'other_trusted_adult'];
const PICKUP_SCOPES = ['all_children', 'specific_children'];

const MEMBER_SELECT = 'id, first_name, last_name, relationship, phone, email, authorized_pickup, pickup_scope, emergency_contact, notes, created_by, created_by_name, created_at, updated_at';

type ExistingMember = {
  id: string; first_name: string; last_name: string; phone: string | null;
  authorized_pickup: boolean; pickup_scope: 'all_children' | 'specific_children' | null;
  emergency_contact: boolean;
};

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

async function getExistingChildIds(memberId: string): Promise<string[]> {
  const admin = adminClient();
  const { data } = await admin.from('cm_household_member_children').select('child_id').eq('household_member_id', memberId);
  return (data ?? []).map((r: { child_id: string }) => r.child_id);
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

  const { data: existingRow } = await admin
    .from('cm_household_members')
    .select('id, first_name, last_name, phone, authorized_pickup, pickup_scope, emergency_contact')
    .eq('id', memberId)
    .eq('family_id', id)
    .eq('church_id', auth.churchId)
    .is('archived_at', null)
    .maybeSingle();

  if (!existingRow) return Response.json({ error: 'Not found' }, { status: 404 });
  const existing = existingRow as ExistingMember;
  const existingFullName = `${existing.first_name} ${existing.last_name}`.trim();

  if (isArchive) {
    const { error } = await admin
      .from('cm_household_members')
      .update({ archived_at: new Date().toISOString(), archived_by: auth.userId })
      .eq('id', memberId)
      .eq('family_id', id)
      .eq('church_id', auth.churchId);

    if (error) return Response.json({ error: error.message }, { status: 400 });

    if (existing.authorized_pickup) {
      const existingChildIds = existing.pickup_scope === 'specific_children' ? await getExistingChildIds(memberId) : [];
      await syncPickupForMember({
        churchId: auth.churchId, familyId: id,
        oldFullName: existingFullName, newFullName: null,
        authorizedPickup: false, pickupScope: null, childIds: existingChildIds,
      });
    }
    if (existing.emergency_contact) {
      await setHouseholdEmergencyContact({ churchId: auth.churchId, familyId: id, name: null, phone: null, memberId: null });
    }

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

  if (typeof body?.authorizedPickup === 'boolean') {
    const authorizedPickup = body.authorizedPickup;
    updateData.authorized_pickup = authorizedPickup;

    if (authorizedPickup) {
      const pickupScope = String(body?.pickupScope ?? '').trim();
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

  // Recompute effective (post-write) state to keep the legacy pickup field and
  // the family-level emergency contact in sync — using existing values as the
  // fallback for anything this request didn't touch.
  const newFirstName = typeof updateData.first_name === 'string' ? updateData.first_name : existing.first_name;
  const newLastName = typeof updateData.last_name === 'string' ? updateData.last_name : existing.last_name;
  const newFullName = `${newFirstName} ${newLastName}`.trim();
  const effectiveAuthorizedPickup = 'authorized_pickup' in updateData ? Boolean(updateData.authorized_pickup) : existing.authorized_pickup;
  const effectivePickupScope = 'pickup_scope' in updateData
    ? (updateData.pickup_scope as 'all_children' | 'specific_children' | null)
    : existing.pickup_scope;
  const effectiveChildIds = childIds !== null
    ? childIds
    : (effectivePickupScope === 'specific_children' ? await getExistingChildIds(memberId) : []);

  await syncPickupForMember({
    churchId: auth.churchId, familyId: id,
    oldFullName: existingFullName, newFullName,
    authorizedPickup: effectiveAuthorizedPickup, pickupScope: effectivePickupScope, childIds: effectiveChildIds,
  });

  const effectiveEmergencyContact = 'emergency_contact' in updateData ? Boolean(updateData.emergency_contact) : existing.emergency_contact;
  const effectivePhone = 'phone' in updateData ? (updateData.phone as string | null) : existing.phone;

  if (effectiveEmergencyContact) {
    await setHouseholdEmergencyContact({ churchId: auth.churchId, familyId: id, name: newFullName, phone: effectivePhone, memberId });
  } else if (existing.emergency_contact) {
    await setHouseholdEmergencyContact({ churchId: auth.churchId, familyId: id, name: null, phone: null, memberId: null });
  }

  const { data: updated, error: fetchError } = await admin
    .from('cm_household_members')
    .select(MEMBER_SELECT)
    .eq('id', memberId)
    .single();

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 400 });

  const linkChildIds = effectivePickupScope === 'specific_children' ? effectiveChildIds : [];

  return Response.json({ member: { ...updated, childIds: linkChildIds } });
}
