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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const admin = adminClient();

  const updateData: Record<string, any> = {};
  if ('follow_up_sent' in body) updateData.follow_up_sent = body.follow_up_sent;
  if ('next_day_sent' in body) updateData.next_day_sent = body.next_day_sent;
  if ('status' in body) updateData.status = body.status;
  if ('notes' in body) updateData.notes = body.notes;

  const { error } = await admin
    .from('cm_visitor_families')
    .update(updateData)
    .eq('id', id)
    .eq('church_id', auth.churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
