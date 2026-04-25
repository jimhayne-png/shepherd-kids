import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}

async function getChurchId(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.church_id ?? null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient()
    .from('attendance_events')
    .select('id, name, event_date, check_in_token, is_open, created_at, calendar_event_id')
    .eq('church_id', churchId)
    .order('event_date', { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Fetch attendance counts for each event
  const ids = (data ?? []).map((e: any) => e.id);
  let counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: records } = await adminClient()
      .from('attendance_records')
      .select('attendance_event_id')
      .in('attendance_event_id', ids);
    for (const r of records ?? []) {
      counts[r.attendance_event_id] = (counts[r.attendance_event_id] ?? 0) + 1;
    }
  }

  const events = (data ?? []).map((e: any) => ({
    ...e,
    attendee_count: counts[e.id] ?? 0,
  }));

  return Response.json({ events });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { eventName, eventDate, eventId } = body;

  if (!eventName?.trim()) return Response.json({ error: 'Event name is required' }, { status: 400 });
  if (!eventDate) return Response.json({ error: 'Event date is required' }, { status: 400 });

  const token = crypto.randomUUID();

  const { data, error } = await adminClient()
    .from('attendance_events')
    .insert({
      church_id: churchId,
      name: eventName.trim(),
      event_date: eventDate,
      calendar_event_id: eventId || null,
      check_in_token: token,
      is_open: true,
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ success: true, id: data.id, check_in_token: token });
}
