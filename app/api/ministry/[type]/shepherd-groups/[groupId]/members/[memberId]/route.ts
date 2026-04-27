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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; groupId: string; memberId: string }> }
) {
  const { groupId, memberId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { error } = await adminClient()
    .from('shepherd_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('member_id', memberId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
