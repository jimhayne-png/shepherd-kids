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

  const { data } = await adminClient()
    .from('youth_permission_forms')
    .select('*, youth_students(first_name, last_name, grade, date_of_birth)')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  return Response.json({ forms: data ?? [] });
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

  const { data, error } = await adminClient()
    .from('youth_permission_forms')
    .insert({
      church_id: churchId,
      student_id: body.student_id,
      parent_name: body.parent_name ?? '',
      parent_phone: body.parent_phone ?? '',
      parent_email: body.parent_email ?? '',
      emergency_contact_name: body.emergency_contact_name ?? '',
      emergency_contact_phone: body.emergency_contact_phone ?? '',
      emergency_contact_relationship: body.emergency_contact_relationship ?? '',
      allergies: body.allergies ?? '',
      medications: body.medications ?? '',
      medical_notes: body.medical_notes ?? '',
      on_campus: body.on_campus ?? true,
      off_campus: body.off_campus ?? false,
      overnight: body.overnight ?? false,
      photo_permission: body.photo_permission ?? false,
      video_permission: body.video_permission ?? false,
      physical_signature_received: body.physical_signature_received ?? false,
      signature_received_date: body.signature_received_date ?? null,
      signed_date: signedDate,
      expires_at: expiresAt.toISOString().slice(0, 10),
    })
    .select('*, youth_students(first_name, last_name, grade, date_of_birth)')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ form: data });
}
