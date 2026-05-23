import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

const SPLIT_BONUS = 5000;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await request.json();
  const { newTeamName, newTeamColor, newTeamMascot } = body;
  if (!newTeamName?.trim()) return Response.json({ error: 'New team name required' }, { status: 400 });
  if (!newTeamColor) return Response.json({ error: 'New team color required' }, { status: 400 });

  const admin = adminClient();

  // Load original team
  const { data: team } = await admin.from('children_ministry_teams').select('*').eq('id', teamId).eq('church_id', churchId).maybeSingle();
  if (!team) return Response.json({ error: 'Team not found' }, { status: 404 });
  if (team.member_count < 12) return Response.json({ error: 'Team must have at least 12 members to split' }, { status: 400 });
  if (!team.co_captain_child_id) return Response.json({ error: 'Team must have a co-captain to split' }, { status: 400 });

  // Load all members of original team
  const { data: memberships } = await admin
    .from('children_ministry_team_members')
    .select('id, child_id')
    .eq('team_id', teamId)
    .eq('season_id', team.season_id);

  const allMembers = memberships ?? [];
  // Exclude captain and co-captain from the pool to split
  const splitableIds = allMembers
    .map((m: any) => m.child_id)
    .filter((cid: string) => cid !== team.captain_child_id && cid !== team.co_captain_child_id);

  const half = Math.floor(splitableIds.length / 2);
  const movedChildIds = new Set(splitableIds.slice(0, half));
  movedChildIds.add(team.co_captain_child_id);

  const currentPoints = Number(team.total_points);
  const newTeamPoints = currentPoints + SPLIT_BONUS;
  const originalTeamPoints = currentPoints + SPLIT_BONUS;

  // Create new team
  const { data: newTeam, error: newTeamErr } = await admin.from('children_ministry_teams').insert({
    church_id: churchId,
    season_id: team.season_id,
    name: newTeamName.trim(),
    color: newTeamColor,
    mascot: newTeamMascot?.trim() || null,
    volunteer_leader_name: team.volunteer_leader_name,
    volunteer_leader_email: team.volunteer_leader_email,
    captain_child_id: team.co_captain_child_id,
    co_captain_child_id: null,
    total_points: newTeamPoints,
    member_count: movedChildIds.size,
  }).select('id').single();

  if (newTeamErr) return Response.json({ error: newTeamErr.message }, { status: 400 });

  // Move selected members to new team
  const movedMembershipIds = allMembers.filter((m: any) => movedChildIds.has(m.child_id)).map((m: any) => m.id);
  if (movedMembershipIds.length > 0) {
    await admin.from('children_ministry_team_members').update({ team_id: newTeam.id }).in('id', movedMembershipIds);
  }

  // Update original team
  const remainingCount = allMembers.length - movedChildIds.size;
  await admin.from('children_ministry_teams').update({
    total_points: originalTeamPoints,
    member_count: remainingCount,
    co_captain_child_id: null,
  }).eq('id', teamId);

  // Award split bonus points in points ledger for both teams
  await admin.from('children_ministry_points').insert([
    { church_id: churchId, season_id: team.season_id, team_id: teamId, points: SPLIT_BONUS, category: 'split_bonus', awarded_by: userId, note: `Team split bonus — ${newTeamName.trim()} created` },
    { church_id: churchId, season_id: team.season_id, team_id: newTeam.id, points: SPLIT_BONUS, category: 'split_bonus', awarded_by: userId, note: `Team split bonus — new team from ${team.name}` },
  ]);

  return Response.json({ success: true, newTeamId: newTeam.id });
}
