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
    .from('events')
    .select(`
      id, title, description, location,
      starts_at, ends_at, all_day,
      is_recurring, recurrence_frequency, recurrence_end_date,
      is_all_church, created_at,
      department_id, departments(id, name, color, icon)
    `)
    .eq('church_id', churchId)
    .order('starts_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ events: data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const {
    title, description, location,
    startsAt, endsAt, allDay,
    isRecurring, recurrenceFrequency, recurrenceEndDate,
    isAllChurch, departmentId,
  } = body;

  if (!title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 });
  if (!startsAt) return Response.json({ error: 'Start date is required' }, { status: 400 });

  const { data, error } = await adminClient()
    .from('events')
    .insert({
      church_id: churchId,
      title: title.trim(),
      description: description?.trim() || null,
      location: location?.trim() || null,
      starts_at: startsAt,
      ends_at: endsAt || null,
      all_day: allDay ?? false,
      is_recurring: isRecurring ?? false,
      recurrence_frequency: isRecurring ? (recurrenceFrequency || 'weekly') : null,
      recurrence_end_date: isRecurring ? (recurrenceEndDate || null) : null,
      is_all_church: isAllChurch ?? false,
      department_id: departmentId || null,
    })
    .select('id')
    .single();

  if (error) {
    console.log('Event insert error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true, event_id: data.id });
}
