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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient()
    .from('children_ministry_seasons')
    .select('*')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ seasons: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { name, startDate, rewardDescription, rewardDate, status, seasonLengthWeeks } = body;
  let { endDate } = body;

  if (!name?.trim()) return Response.json({ error: 'Season name is required' }, { status: 400 });
  if (!startDate) return Response.json({ error: 'Start date is required' }, { status: 400 });

  // Compute end date from season length if not supplied directly
  if (!endDate && seasonLengthWeeks) {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + Number(seasonLengthWeeks) * 7 - 1);
    endDate = d.toISOString().slice(0, 10);
  }
  if (!endDate) return Response.json({ error: 'End date or season length is required' }, { status: 400 });

  const admin = adminClient();

  // If activating this season, deactivate others
  if (status === 'active') {
    await admin.from('children_ministry_seasons').update({ status: 'completed' }).eq('church_id', churchId).eq('status', 'active');
  }

  const { data, error } = await admin.from('children_ministry_seasons').insert({
    church_id: churchId,
    name: name.trim(),
    start_date: startDate,
    end_date: endDate,
    season_length_weeks: seasonLengthWeeks ? Number(seasonLengthWeeks) : null,
    reward_description: rewardDescription?.trim() || null,
    reward_date: rewardDate || null,
    status: status ?? 'upcoming',
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ season: data });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { id, name, startDate, endDate, rewardDescription, rewardDate, status } = body;
  if (!id) return Response.json({ error: 'Season id required' }, { status: 400 });

  const admin = adminClient();

  if (status === 'active') {
    await admin.from('children_ministry_seasons').update({ status: 'completed' }).eq('church_id', churchId).eq('status', 'active').neq('id', id);
  }

  const updates: Record<string, unknown> = {};
  if (name) updates.name = name.trim();
  if (startDate) updates.start_date = startDate;
  if (endDate) updates.end_date = endDate;
  if (rewardDescription !== undefined) updates.reward_description = rewardDescription?.trim() || null;
  if (rewardDate !== undefined) updates.reward_date = rewardDate || null;
  if (status) updates.status = status;

  const { data, error } = await admin.from('children_ministry_seasons').update(updates).eq('id', id).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ season: data });
}
