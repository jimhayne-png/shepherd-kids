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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();

  if (body.physical_signature_received === true && !body.signature_received_date) {
    body.signature_received_date = new Date().toISOString().slice(0, 10);
  }

  // Remap frontend field names to actual DB column names
  if ('on_campus' in body)  { body.on_campus_permission  = body.on_campus;  delete body.on_campus; }
  if ('off_campus' in body) { body.off_campus_permission = body.off_campus; delete body.off_campus; }
  if ('overnight' in body)  { body.overnight_permission  = body.overnight;  delete body.overnight; }

  const admin = adminClient();
  const { data, error } = await admin
    .from('youth_permission_forms')
    .update(body)
    .eq('id', id)
    .eq('church_id', churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Look up student from the correct table based on the form's ministry_type
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { error } = await adminClient()
    .from('youth_permission_forms')
    .delete()
    .eq('id', id)
    .eq('church_id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
