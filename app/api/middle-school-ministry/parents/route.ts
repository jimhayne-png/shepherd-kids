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
    .from('middle_school_parents')
    .select('*, middle_school_students(first_name, last_name)')
    .eq('church_id', churchId)
    .order('last_name', { ascending: true });

  return Response.json({ parents: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const { data, error } = await adminClient()
    .from('middle_school_parents')
    .insert({
      church_id: churchId,
      student_id: body.student_id || null,
      first_name: body.first_name ?? '',
      last_name: body.last_name ?? '',
      phone: body.phone || null,
      email: body.email || null,
      relationship: body.relationship || null,
      is_primary: body.is_primary ?? true,
    })
    .select('*, middle_school_students(first_name, last_name)')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ parent: data });
}
