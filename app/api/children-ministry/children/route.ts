import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const admin = adminClient();

  const { data: children, error } = await admin
    .from('cm_visitor_children')
    .select('id, first_name, last_name, date_of_birth, family_id')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const familyIds = [...new Set((children ?? []).map((c: any) => c.family_id as string).filter(Boolean))];

  const { data: families } = familyIds.length
    ? await admin
        .from('cm_visitor_families')
        .select('id, parent1_first_name, parent1_last_name, parent1_phone, parent1_email, visit_date')
        .in('id', familyIds)
    : { data: [] };

  const familyMap: Record<string, any> = {};
  for (const f of families ?? []) familyMap[f.id] = f;

  const result = (children ?? []).map((c: any) => {
    const fam = familyMap[c.family_id] ?? {};
    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      date_of_birth: c.date_of_birth ?? null,
      parent_name: [fam.parent1_first_name, fam.parent1_last_name].filter(Boolean).join(' ') || null,
      parent_phone: fam.parent1_phone ?? null,
      parent_email: fam.parent1_email ?? null,
      visit_date: fam.visit_date ?? null,
    };
  });

  return Response.json({ children: result });
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await request.json();
  const {
    firstName, lastName, grade, dateOfBirth,
    allergies, medicalNotes,
    parent1Name, parent1Email, parent1Phone,
    parent2Name, parent2Email, parent2Phone,
    authorizedPickups, photoPermission,
  } = body;

  if (!firstName?.trim() || !lastName?.trim()) return Response.json({ error: 'First and last name required' }, { status: 400 });
  if (!grade) return Response.json({ error: 'Grade required' }, { status: 400 });

  const admin = adminClient();

  const { data: child, error } = await admin.from('children_ministry_children').insert({
    church_id: churchId,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    grade,
    date_of_birth: dateOfBirth || null,
    allergies: allergies?.trim() || null,
    medical_notes: medicalNotes?.trim() || null,
    parent1_name: parent1Name?.trim() || null,
    parent1_email: parent1Email?.trim() || null,
    parent1_phone: parent1Phone?.trim() || null,
    parent2_name: parent2Name?.trim() || null,
    parent2_email: parent2Email?.trim() || null,
    parent2_phone: parent2Phone?.trim() || null,
    authorized_pickups: Array.isArray(authorizedPickups) ? authorizedPickups.filter(Boolean) : [],
    photo_permission: photoPermission ?? false,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ child });
}
