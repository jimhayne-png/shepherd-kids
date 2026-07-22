import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can } from '@/lib/staff-permissions';
import { setHouseholdEmergencyContact } from '@/lib/children-ministry/emergency-contact';

const SOURCES = ['parent1', 'parent2', 'member', 'clear'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(auth.role, 'access_children_ministry')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = adminClient();

  const { data: family } = await admin
    .from('cm_visitor_families')
    .select('id, parent1_first_name, parent1_last_name, parent1_phone, parent2_first_name, parent2_last_name, parent2_phone')
    .eq('id', id)
    .eq('church_id', auth.churchId)
    .maybeSingle();

  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const source = String(body?.source ?? '').trim();
  if (!SOURCES.includes(source)) return Response.json({ error: 'Invalid source' }, { status: 400 });

  let name: string | null = null;
  let phone: string | null = null;
  let memberId: string | null = null;

  if (source === 'parent1') {
    name = `${family.parent1_first_name} ${family.parent1_last_name}`.trim();
    phone = family.parent1_phone ?? null;
  } else if (source === 'parent2') {
    if (!family.parent2_first_name) return Response.json({ error: 'No secondary parent on file' }, { status: 400 });
    name = `${family.parent2_first_name} ${family.parent2_last_name ?? ''}`.trim();
    phone = family.parent2_phone ?? null;
  } else if (source === 'member') {
    memberId = String(body?.memberId ?? '').trim();
    if (!memberId) return Response.json({ error: 'memberId is required' }, { status: 400 });
    const { data: member } = await admin
      .from('cm_household_members')
      .select('id, first_name, last_name, phone')
      .eq('id', memberId)
      .eq('family_id', id)
      .eq('church_id', auth.churchId)
      .is('archived_at', null)
      .maybeSingle();
    if (!member) return Response.json({ error: 'Household member not found' }, { status: 404 });
    name = `${member.first_name} ${member.last_name}`.trim();
    phone = member.phone ?? null;
  }
  // source === 'clear' leaves name/phone/memberId as null

  await setHouseholdEmergencyContact({
    churchId: auth.churchId,
    familyId: id,
    name,
    phone,
    memberId,
  });

  return Response.json({ emergencyContactName: name, emergencyContactPhone: phone, memberId });
}
