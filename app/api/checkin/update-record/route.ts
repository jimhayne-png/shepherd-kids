import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data } = await admin.from('church_users').select('church_id').eq('user_id', user.id).maybeSingle();
  if (!data?.church_id) return null;
  return { userId: user.id, churchId: data.church_id as string };
}

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = adminClient();
  const { data: rooms } = await admin
    .from('cm_checkin_rooms')
    .select('id, name')
    .eq('church_id', auth.churchId)
    .eq('is_active', true)
    .order('name');
  return Response.json({ rooms: rooms ?? [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { recordId, roomId } = await request.json();
  if (!recordId) return Response.json({ error: 'recordId required' }, { status: 400 });
  const admin = adminClient();
  const { error } = await admin
    .from('cm_checkin_records')
    .update({ room_id: roomId ?? null })
    .eq('id', recordId)
    .eq('church_id', auth.churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { recordId } = await request.json();
  if (!recordId) return Response.json({ error: 'recordId required' }, { status: 400 });
  const admin = adminClient();
  const { error } = await admin
    .from('cm_checkin_records')
    .delete()
    .eq('id', recordId)
    .eq('church_id', auth.churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
