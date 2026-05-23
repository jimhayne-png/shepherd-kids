import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

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
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const { title, event_date, start_time, end_time, notes } = await req.json();
  if (!title?.trim() || !event_date) return Response.json({ error: 'Title and event_date required' }, { status: 400 });

  const { data, error } = await adminClient().from('cm_service_events').insert({
    church_id: churchId, title: title.trim(), event_date, start_time: start_time || null, end_time: end_time || null, notes: notes?.trim() || null,
  }).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ event: data });
}
