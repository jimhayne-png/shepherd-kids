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

  const { data, error } = await adminClient()
    .from('cm_visitor_checkin_tokens')
    .select('*')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ tokens: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { label } = await req.json();
  const { data, error } = await adminClient()
    .from('cm_visitor_checkin_tokens')
    .insert({ church_id: churchId, label: label?.trim() || 'Check-In Point' })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ token: data });
}
