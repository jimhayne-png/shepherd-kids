import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const seasonId = request.nextUrl.searchParams.get('season_id');
  const admin = adminClient();

  let query = admin.from('children_ministry_teams').select(`
    *,
    captain:captain_child_id(id, first_name, last_name),
    co_captain:co_captain_child_id(id, first_name, last_name)
  `).eq('church_id', churchId).order('total_points', { ascending: false });

  if (seasonId) query = query.eq('season_id', seasonId);

  const { data: teams, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Fetch members for each team
  const teamIds = (teams ?? []).map((t: any) => t.id);
  if (teamIds.length === 0) return Response.json({ teams: [] });

  const { data: memberships } = await admin
    .from('children_ministry_team_members')
    .select('team_id, child_id, children_ministry_children(id, first_name, last_name, grade)')
    .in('team_id', teamIds);

  const memberMap: Record<string, any[]> = {};
  for (const m of memberships ?? []) {
    if (!memberMap[m.team_id]) memberMap[m.team_id] = [];
    memberMap[m.team_id].push(m.children_ministry_children);
  }

  const enriched = (teams ?? []).map((t: any) => ({
    ...t,
    members: memberMap[t.id] ?? [],
  }));

  return Response.json({ teams: enriched });
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await request.json();
  const { seasonId, name, color, mascot, volunteerLeaderName, volunteerLeaderEmail, captainChildId, coCaptainChildId } = body;

  if (!seasonId) return Response.json({ error: 'Season is required' }, { status: 400 });
  if (!name?.trim()) return Response.json({ error: 'Team name is required' }, { status: 400 });
  if (!color) return Response.json({ error: 'Team color is required' }, { status: 400 });

  const { data, error } = await adminClient().from('children_ministry_teams').insert({
    church_id: churchId,
    season_id: seasonId,
    name: name.trim(),
    color,
    mascot: mascot?.trim() || null,
    volunteer_leader_name: volunteerLeaderName?.trim() || null,
    volunteer_leader_email: volunteerLeaderEmail?.trim() || null,
    captain_child_id: captainChildId || null,
    co_captain_child_id: coCaptainChildId || null,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ team: data });
}
