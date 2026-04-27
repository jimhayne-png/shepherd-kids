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

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const { data: events, error } = await admin.from('cm_service_events').select('*').eq('church_id', churchId).order('event_date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const eventIds = (events ?? []).map((e: any) => e.id);
  const { data: assignments } = eventIds.length
    ? await admin.from('cm_volunteer_assignments').select('event_id, status').in('event_id', eventIds)
    : { data: [] };

  const assignMap: Record<string, any[]> = {};
  for (const a of assignments ?? []) {
    if (!assignMap[a.event_id]) assignMap[a.event_id] = [];
    assignMap[a.event_id].push(a);
  }

  const enriched = (events ?? []).map((e: any) => ({
    ...e,
    assignment_count: assignMap[e.id]?.length ?? 0,
    confirmed_count: assignMap[e.id]?.filter((a: any) => a.status === 'confirmed').length ?? 0,
  }));

  return Response.json({ events: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { title, event_date, start_time, end_time, notes } = await req.json();
  if (!title?.trim() || !event_date) return Response.json({ error: 'Title and event_date required' }, { status: 400 });

  const { data, error } = await adminClient().from('cm_service_events').insert({
    church_id: churchId, title: title.trim(), event_date, start_time: start_time || null, end_time: end_time || null, notes: notes?.trim() || null,
  }).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ event: data });
}
