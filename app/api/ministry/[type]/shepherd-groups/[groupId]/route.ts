import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; groupId: string }> }
) {
  const { groupId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.volunteer_name !== undefined) updates.volunteer_name = body.volunteer_name.trim();
  if (body.volunteer_email !== undefined) updates.volunteer_email = body.volunteer_email?.trim() || null;
  if (body.volunteer_phone !== undefined) updates.volunteer_phone = body.volunteer_phone?.trim() || null;
  if (body.leadership_kid_id !== undefined) updates.leadership_kid_id = body.leadership_kid_id || null;

  const { data, error } = await adminClient()
    .from('shepherd_groups')
    .update(updates)
    .eq('id', groupId)
    .eq('church_id', churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ group: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; groupId: string }> }
) {
  const { groupId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  await admin.from('shepherd_group_members').delete().eq('group_id', groupId);
  await admin.from('shepherd_group_contacts').delete().eq('group_id', groupId);
  const { error } = await admin.from('shepherd_groups').delete().eq('id', groupId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
