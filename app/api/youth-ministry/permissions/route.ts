import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const url = new URL(req.url);
  const ministryType = url.searchParams.get('ministry_type');

  let query = admin
    .from('youth_permission_forms')
    .select('*')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  if (ministryType) query = query.eq('ministry_type', ministryType);

  const { data: forms } = await query;
  if (!forms || forms.length === 0) return Response.json({ forms: [] });

  // Fetch student info from the correct table based on each form's ministry_type
  const msIds = forms.filter(f => f.ministry_type === 'middle-school' && f.student_id).map(f => f.student_id);
  const hsIds = forms.filter(f => f.ministry_type === 'high-school' && f.student_id).map(f => f.student_id);
  console.log('[Permissions GET] forms count:', forms?.length, 'hsIds:', hsIds);

  const [msStudents, hsStudents] = await Promise.all([
    msIds.length > 0
      ? admin.from('middle_school_students').select('id, first_name, last_name, grade, date_of_birth').in('id', msIds)
      : Promise.resolve({ data: [] }),
    hsIds.length > 0
      ? admin.from('high_school_students').select('id, first_name, last_name, grade, date_of_birth').in('id', hsIds)
      : Promise.resolve({ data: [] }),
  ]);

  console.log('[Permissions GET] hsStudents:', hsStudents.data);
  const studentMap: Record<string, any> = {};
  for (const s of (msStudents.data ?? [])) studentMap[s.id] = s;
  for (const s of (hsStudents.data ?? [])) studentMap[s.id] = s;
  console.log('[Permissions GET] studentMap keys:', Object.keys(studentMap));

  const enriched = forms.map(f => ({
    ...f,
    student: f.student_id ? (studentMap[f.student_id] ?? null) : null,
  }));

  return Response.json({ forms: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const signedDate = body.signed_date || new Date().toISOString().slice(0, 10);
  const expiresAt = new Date(signedDate);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const admin = adminClient();
  const { data, error } = await admin
    .from('youth_permission_forms')
    .insert({
      church_id: churchId,
      student_id: body.student_id,
      ministry_type: body.ministry_type ?? null,
      parent_name: body.parent_name ?? '',
      parent_phone: body.parent_phone ?? '',
      parent_email: body.parent_email ?? '',
      emergency_contact_name: body.emergency_contact_name ?? '',
      emergency_contact_phone: body.emergency_contact_phone ?? '',
      emergency_contact_relationship: body.emergency_contact_relationship ?? '',
      allergies: body.allergies ?? '',
      medications: body.medications ?? '',
      medical_notes: body.medical_notes ?? '',
      on_campus_permission: body.on_campus ?? true,
      off_campus_permission: body.off_campus ?? false,
      overnight_permission: body.overnight ?? false,
      photo_permission: body.photo_permission ?? false,
      video_permission: body.video_permission ?? false,
      physical_signature_received: body.physical_signature_received ?? false,
      signature_received_date: body.signature_received_date ?? null,
      signed_date: signedDate,
      expires_at: expiresAt.toISOString().slice(0, 10),
    })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Enrich with student data
  let student = null;
  if (data.student_id) {
    const table = data.ministry_type === 'high-school' ? 'high_school_students' : 'middle_school_students';
    const { data: s } = await admin
      .from(table)
      .select('id, first_name, last_name, grade, date_of_birth')
      .eq('id', data.student_id)
      .maybeSingle();
    student = s;
  }

  return Response.json({ form: { ...data, student } });
}
