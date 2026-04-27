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

export async function GET(req: NextRequest, { params }: { params: Promise<{ bulletinId: string }> }) {
  const { bulletinId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient().from('bulletin_announcements').select('*').eq('bulletin_id', bulletinId).eq('church_id', churchId).order('sort_order');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ announcements: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ bulletinId: string }> }) {
  const { bulletinId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { title, body, link_url, link_label, sort_order } = await req.json();
  if (!title?.trim()) return Response.json({ error: 'title required' }, { status: 400 });

  const { data, error } = await adminClient().from('bulletin_announcements').insert({
    church_id: churchId, bulletin_id: bulletinId, title: title.trim(),
    body: body?.trim() || null, link_url: link_url?.trim() || null,
    link_label: link_label?.trim() || null, sort_order: sort_order ?? 0,
  }).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ announcement: data });
}
