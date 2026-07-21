import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can } from '@/lib/staff-permissions';
import { getFamilyForChurch, getActorName } from '@/lib/children-ministry/family-care';

const RELATIONSHIPS = ['parent_guardian', 'grandparent', 'authorized_pickup', 'other_trusted_adult'];
const PICKUP_SCOPES = ['all_children', 'specific_children'];

const MEMBER_SELECT = 'id, first_name, last_name, relationship, phone, email, authorized_pickup, pickup_scope, emergency_contact, notes, created_by, created_by_name, created_at, updated_at';

async function attachChildIds(memberIds: string[]) {
  if (memberIds.length === 0) return new Map<string, string[]>();
  const admin = adminClient();
  const { data } = await admin
    .from('cm_household_member_children')
    .select('household_member_id, child_id')
    .in('household_member_id', memberIds);

  const map = new Map<string, string[]>();
  for (const row of (data ?? []) as { household_member_id: string; child_id: string }[]) {
    const list = map.get(row.household_member_id) ?? [];
    list.push(row.child_id);
    map.set(row.household_member_id, list);
  }
  return map;
}

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

  const { data, error } = await adminClient()
    .from('cm_household_members')
    .select(MEMBER_SELECT)
    .eq('family_id', id)
    .eq('church_id', auth.churchId)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const members = (data ?? []) as { id: string }[];
  const childIdMap = await attachChildIds(members.map(m => m.id));

  const result = members.map(m => ({
    ...m,
    childIds: childIdMap.get(m.id) ?? [],
  }));

  return Response.json({ members: result });
}

export async function POST(
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

  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? '').trim();
  const lastName = String(body?.lastName ?? '').trim();
  const relationship = String(body?.relationship ?? '').trim();
  const phone = body?.phone ? String(body.phone).trim() : null;
  const email = body?.email ? String(body.email).trim() : null;
  const authorizedPickup = body?.authorizedPickup === true;
  const pickupScope = authorizedPickup ? String(body?.pickupScope ?? '').trim() : null;
  const childIds: string[] = Array.isArray(body?.childIds) ? body.childIds.filter((c: unknown) => typeof c === 'string') : [];
  const emergencyContact = body?.emergencyContact === true;
  const notes = body?.notes ? String(body.notes).trim() : null;

  if (!firstName || !lastName) return Response.json({ error: 'firstName and lastName are required' }, { status: 400 });
  if (!RELATIONSHIPS.includes(relationship)) return Response.json({ error: 'Invalid relationship' }, { status: 400 });
  if (authorizedPickup && !PICKUP_SCOPES.includes(pickupScope ?? '')) {
    return Response.json({ error: 'pickupScope is required when authorizedPickup is true' }, { status: 400 });
  }
  if (authorizedPickup && pickupScope === 'specific_children') {
    const valid = await validateChildIds(childIds, id, auth.churchId);
    if (!valid) return Response.json({ error: 'One or more childIds are invalid for this household' }, { status: 400 });
  }

  const actorName = await getActorName(auth.userId);
  const admin = adminClient();

  const { data, error } = await admin
    .from('cm_household_members')
    .insert({
      church_id: auth.churchId,
      family_id: id,
      first_name: firstName,
      last_name: lastName,
      relationship,
      phone,
      email,
      authorized_pickup: authorizedPickup,
      pickup_scope: pickupScope,
      emergency_contact: emergencyContact,
      notes,
      created_by: auth.userId,
      created_by_name: actorName,
    })
    .select(MEMBER_SELECT)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  let resultChildIds: string[] = [];
  if (authorizedPickup && pickupScope === 'specific_children' && childIds.length > 0) {
    await admin.from('cm_household_member_children').insert(
      childIds.map(childId => ({ church_id: auth.churchId, household_member_id: data.id, child_id: childId })),
    );
    resultChildIds = childIds;
  }

  return Response.json({ member: { ...data, childIds: resultChildIds } });
}
