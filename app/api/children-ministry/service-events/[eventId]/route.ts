import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
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
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  await adminClient().from('cm_volunteer_assignments').delete().eq('event_id', eventId);
  const { error } = await adminClient().from('cm_service_events').delete().eq('id', eventId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
