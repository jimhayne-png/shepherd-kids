import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const body = await request.json().catch(() => ({}));
  const {
    family_id,
    first_name, last_name,
    date_of_birth, grade,
    allergies, medical_notes, special_instructions,
    authorized_pickups,
    photo_permission_status,
  } = body as Record<string, string | undefined>;

  const fname = first_name?.trim() ?? '';
  const lname = last_name?.trim() ?? '';
  if (!fname || !lname) {
    return Response.json({ error: 'First name and last name are required.' }, { status: 400 });
  }
  if (!family_id) {
    return Response.json({ error: 'family_id is required.' }, { status: 400 });
  }

  const admin = adminClient();

  // Verify family belongs to this church.
  const { data: family, error: famErr } = await admin
    .from('cm_visitor_families')
    .select('id')
    .eq('id', family_id)
    .eq('church_id', churchId)
    .maybeSingle();

  if (famErr || !family) {
    return Response.json({ error: 'Household not found.' }, { status: 404 });
  }

  const validPhotoStatus = ['not_reviewed', 'granted', 'denied'];
  const photoStatus = validPhotoStatus.includes(photo_permission_status ?? '')
    ? photo_permission_status
    : 'not_reviewed';

  const { data: child, error } = await admin
    .from('cm_visitor_children')
    .insert({
      church_id:             churchId,
      family_id,
      first_name:            fname,
      last_name:             lname,
      date_of_birth:         date_of_birth?.trim() || null,
      grade:                 grade?.trim() || null,
      allergies:             allergies?.trim() || null,
      medical_notes:         medical_notes?.trim() || null,
      special_instructions:  special_instructions?.trim() || null,
      authorized_pickups:    authorized_pickups?.trim() || null,
      photo_permission_status: photoStatus,
    })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ child }, { status: 201 });
}
