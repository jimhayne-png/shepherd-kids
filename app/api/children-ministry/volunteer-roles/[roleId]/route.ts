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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.color !== undefined) updates.color = body.color;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  const { data, error } = await adminClient().from('cm_volunteer_roles').update(updates).eq('id', roleId).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ role: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });
  const { error } = await adminClient().from('cm_volunteer_roles').delete().eq('id', roleId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
