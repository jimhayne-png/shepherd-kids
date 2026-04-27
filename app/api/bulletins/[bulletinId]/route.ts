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

  const admin = adminClient();
  const [bulletinRes, sectionsRes, announcementsRes] = await Promise.all([
    admin.from('bulletins').select('*').eq('id', bulletinId).eq('church_id', churchId).maybeSingle(),
    admin.from('bulletin_sections').select('*').eq('bulletin_id', bulletinId).order('sort_order'),
    admin.from('bulletin_announcements').select('*').eq('bulletin_id', bulletinId).order('sort_order'),
  ]);

  if (!bulletinRes.data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ bulletin: bulletinRes.data, sections: sectionsRes.data ?? [], announcements: announcementsRes.data ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ bulletinId: string }> }) {
  const { bulletinId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.service_date !== undefined) updates.service_date = body.service_date;
  if (body.status !== undefined) updates.status = body.status;
  if (body.uploaded_bulletin_url !== undefined) updates.uploaded_bulletin_url = body.uploaded_bulletin_url?.trim() || null;

  const { data, error } = await adminClient().from('bulletins').update(updates).eq('id', bulletinId).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ bulletin: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ bulletinId: string }> }) {
  const { bulletinId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  await Promise.all([
    admin.from('bulletin_sections').delete().eq('bulletin_id', bulletinId),
    admin.from('bulletin_announcements').delete().eq('bulletin_id', bulletinId),
  ]);
  const { error } = await admin.from('bulletins').delete().eq('id', bulletinId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
