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

  const { data, error } = await adminClient().from('pastoral_staff').select('*').eq('church_id', churchId).order('active', { ascending: false }).order('name');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ staff: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { name, title, email, phone } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });

  const { data, error } = await adminClient().from('pastoral_staff').insert({
    church_id: churchId, name: name.trim(), title: title?.trim() || null, email: email?.trim() || null, phone: phone?.trim() || null, active: true,
  }).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ staff: data });
}
