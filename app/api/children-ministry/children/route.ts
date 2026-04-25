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
  const admin = adminClient();

  const { data: children, error } = await admin
    .from('children_ministry_children')
    .select('*')
    .eq('church_id', churchId)
    .eq('active', true)
    .order('last_name', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (!seasonId) return Response.json({ children: children ?? [] });

  // Enrich with team and season points
  const childIds = (children ?? []).map((c: any) => c.id);

  const [membershipsRes, pointsRes] = await Promise.all([
    admin.from('children_ministry_team_members')
      .select('child_id, team_id, children_ministry_teams(id, name, color)')
      .eq('season_id', seasonId)
      .in('child_id', childIds),
    admin.from('children_ministry_points')
      .select('child_id, points')
      .eq('season_id', seasonId)
      .eq('church_id', churchId)
      .not('child_id', 'is', null),
  ]);

  const teamMap: Record<string, any> = {};
  for (const m of membershipsRes.data ?? []) {
    teamMap[m.child_id] = m.children_ministry_teams;
  }

  const pointsMap: Record<string, number> = {};
  for (const p of pointsRes.data ?? []) {
    if (p.child_id) pointsMap[p.child_id] = (pointsMap[p.child_id] ?? 0) + Number(p.points);
  }

  const enriched = (children ?? []).map((c: any) => ({
    ...c,
    team: teamMap[c.id] ?? null,
    season_points: pointsMap[c.id] ?? 0,
  }));

  return Response.json({ children: enriched });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const {
    firstName, lastName, grade, dateOfBirth,
    allergies, medicalNotes,
    parent1Name, parent1Email, parent1Phone,
    parent2Name, parent2Email, parent2Phone,
    authorizedPickups, photoPermission,
    seasonId, teamId,
  } = body;

  if (!firstName?.trim() || !lastName?.trim()) return Response.json({ error: 'First and last name required' }, { status: 400 });
  if (!grade) return Response.json({ error: 'Grade required' }, { status: 400 });

  const admin = adminClient();

  const { data: child, error } = await admin.from('children_ministry_children').insert({
    church_id: churchId,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    grade,
    date_of_birth: dateOfBirth || null,
    allergies: allergies?.trim() || null,
    medical_notes: medicalNotes?.trim() || null,
    parent1_name: parent1Name?.trim() || null,
    parent1_email: parent1Email?.trim() || null,
    parent1_phone: parent1Phone?.trim() || null,
    parent2_name: parent2Name?.trim() || null,
    parent2_email: parent2Email?.trim() || null,
    parent2_phone: parent2Phone?.trim() || null,
    authorized_pickups: Array.isArray(authorizedPickups) ? authorizedPickups.filter(Boolean) : [],
    photo_permission: photoPermission ?? false,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Optionally assign to team in a season
  if (seasonId && teamId) {
    await admin.from('children_ministry_team_members').insert({
      church_id: churchId,
      season_id: seasonId,
      team_id: teamId,
      child_id: child.id,
    });
    const { count } = await admin.from('children_ministry_team_members').select('*', { count: 'exact', head: true }).eq('team_id', teamId);
    await admin.from('children_ministry_teams').update({ member_count: count ?? 0 }).eq('id', teamId);
  }

  return Response.json({ child });
}
