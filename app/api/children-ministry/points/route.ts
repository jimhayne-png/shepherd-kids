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

  const seasonId = request.nextUrl.searchParams.get('season_id');
  const teamId = request.nextUrl.searchParams.get('team_id');
  const childId = request.nextUrl.searchParams.get('child_id');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50');

  const admin = adminClient();
  let query = admin.from('children_ministry_points').select(`
    *,
    team:team_id(id, name, color),
    child:child_id(id, first_name, last_name)
  `).eq('church_id', churchId).order('created_at', { ascending: false }).limit(limit);

  if (seasonId) query = query.eq('season_id', seasonId);
  if (teamId) query = query.eq('team_id', teamId);
  if (childId) query = query.eq('child_id', childId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ points: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { seasonId, teamId, childId, category, points, note } = body;

  if (!seasonId) return Response.json({ error: 'Season required' }, { status: 400 });
  if (!teamId && !childId) return Response.json({ error: 'Team or child required' }, { status: 400 });
  if (!category) return Response.json({ error: 'Category required' }, { status: 400 });
  if (!points || Number(points) <= 0) return Response.json({ error: 'Points must be positive' }, { status: 400 });

  const admin = adminClient();
  const pts = Number(points);

  // Determine the team to credit
  let resolvedTeamId = teamId || null;
  if (!resolvedTeamId && childId) {
    const { data: membership } = await admin
      .from('children_ministry_team_members')
      .select('team_id')
      .eq('child_id', childId)
      .eq('season_id', seasonId)
      .maybeSingle();
    resolvedTeamId = membership?.team_id ?? null;
  }

  // Insert point record
  const { data: pointRecord, error } = await admin.from('children_ministry_points').insert({
    church_id: churchId,
    season_id: seasonId,
    team_id: resolvedTeamId,
    child_id: childId || null,
    category,
    points: pts,
    awarded_by: user.id,
    note: note?.trim() || null,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Update team total_points
  if (resolvedTeamId) {
    const { data: current } = await admin.from('children_ministry_teams').select('total_points').eq('id', resolvedTeamId).single();
    const newTotal = Number(current?.total_points ?? 0) + pts;
    await admin.from('children_ministry_teams').update({ total_points: newTotal }).eq('id', resolvedTeamId);
  }

  return Response.json({ point: pointRecord });
}
