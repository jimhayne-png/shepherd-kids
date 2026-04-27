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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.event_date !== undefined) updates.event_date = body.event_date;
  if (body.start_time !== undefined) updates.start_time = body.start_time || null;
  if (body.end_time !== undefined) updates.end_time = body.end_time || null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.status !== undefined) updates.status = body.status;
  const { data, error } = await adminClient().from('cm_service_events').update(updates).eq('id', eventId).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ event: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });
  await adminClient().from('cm_volunteer_assignments').delete().eq('event_id', eventId);
  const { error } = await adminClient().from('cm_service_events').delete().eq('id', eventId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
