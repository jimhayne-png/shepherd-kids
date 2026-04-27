import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient()
    .from('ministry_visitors')
    .select('*')
    .eq('church_id', churchId)
    .eq('ministry_type', type)
    .order('last_visit_date', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ visitors: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { first_name, last_name, email, phone } = await req.json();
  if (!first_name?.trim() || !last_name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await adminClient().from('ministry_visitors').insert({
    church_id: churchId, ministry_type: type,
    first_name: first_name.trim(), last_name: last_name.trim(),
    email: email?.trim() || null, phone: phone?.trim() || null,
    visit_count: 1, first_visit_date: today, last_visit_date: today,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ visitor: data });
}
