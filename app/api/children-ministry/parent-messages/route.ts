import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await adminClient()
    .from('church_parent_messages')
    .select('id, title, body, audience, room_id, status, sent_at, created_at, updated_at')
    .eq('church_id', ctx.churchId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title    = (typeof body.title    === 'string' ? body.title    : '').trim();
  const msgBody  = (typeof body.body     === 'string' ? body.body     : '').trim();
  const audience = (typeof body.audience === 'string' ? body.audience : 'all_parents');
  const roomId   = (typeof body.room_id  === 'string' ? body.room_id  : null);

  const validAudiences = ['all_parents', 'checked_in_today', 'first_time', 'selected_room'];
  if (!validAudiences.includes(audience)) {
    return Response.json({ error: 'Invalid audience' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('church_parent_messages')
    .insert({
      church_id: ctx.churchId,
      title,
      body: msgBody,
      audience,
      room_id: audience === 'selected_room' ? roomId : null,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ message: data });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id, action } = body as { id?: string; action?: string };
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const admin = adminClient();

  // Verify ownership
  const { data: existing } = await admin
    .from('church_parent_messages')
    .select('id, status')
    .eq('id', id)
    .eq('church_id', ctx.churchId)
    .maybeSingle();
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  let update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === 'mark_sent') {
    update = { ...update, status: 'sent', sent_at: new Date().toISOString() };
  } else if (action === 'save_draft') {
    const title   = typeof body.title    === 'string' ? body.title.trim()    : undefined;
    const msgBody = typeof body.body     === 'string' ? body.body.trim()     : undefined;
    const audience = typeof body.audience === 'string' ? body.audience        : undefined;
    const roomId  = typeof body.room_id  === 'string' ? body.room_id         : undefined;
    if (title    !== undefined) update.title    = title;
    if (msgBody  !== undefined) update.body     = msgBody;
    if (audience !== undefined) update.audience = audience;
    update.room_id = audience === 'selected_room' ? (roomId ?? null) : null;
  } else {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('church_parent_messages')
    .update(update)
    .eq('id', id)
    .eq('church_id', ctx.churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ message: data });
}
