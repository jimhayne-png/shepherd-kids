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

const BASE_STREAK_BONUSES: Record<number, number> = {
  3: 3000,
  5: 5000,
  10: 10000,
};
const FULL_SEASON_BONUS = 25000;

function buildStreakBonuses(seasonLengthWeeks: number): Record<number, number> {
  const bonuses = { ...BASE_STREAK_BONUSES };
  // Add full-season threshold only if it doesn't overlap a fixed milestone
  if (![3, 5, 10].includes(seasonLengthWeeks)) {
    bonuses[seasonLengthWeeks] = FULL_SEASON_BONUS;
  }
  return bonuses;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const seasonId = request.nextUrl.searchParams.get('season_id');
  if (!seasonId) return Response.json({ error: 'season_id required' }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin
    .from('children_ministry_attendance')
    .select('*')
    .eq('church_id', churchId)
    .eq('season_id', seasonId)
    .order('session_date', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ attendance: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { seasonId, childId, sessionDate, present } = body;

  if (!seasonId || !childId || !sessionDate) return Response.json({ error: 'seasonId, childId, sessionDate required' }, { status: 400 });

  const admin = adminClient();

  // Look up season to determine actual length for full-season bonus threshold
  const { data: season } = await admin
    .from('children_ministry_seasons')
    .select('start_date, end_date, season_length_weeks')
    .eq('id', seasonId)
    .maybeSingle();

  let seasonLengthWeeks = season?.season_length_weeks ?? null;
  if (!seasonLengthWeeks && season?.start_date && season?.end_date) {
    const ms = new Date(season.end_date + 'T00:00:00').getTime() - new Date(season.start_date + 'T00:00:00').getTime();
    seasonLengthWeeks = Math.round(ms / (7 * 24 * 60 * 60 * 1000)) + 1;
  }
  const STREAK_BONUSES = buildStreakBonuses(seasonLengthWeeks ?? 8);

  // Upsert attendance record
  const { data: existing } = await admin
    .from('children_ministry_attendance')
    .select('id, consecutive_weeks')
    .eq('child_id', childId)
    .eq('session_date', sessionDate)
    .maybeSingle();

  let consecutiveWeeks = 1;

  if (present !== false) {
    // Calculate streak: count consecutive present Sundays ending at sessionDate
    const { data: recentAtt } = await admin
      .from('children_ministry_attendance')
      .select('session_date, present')
      .eq('child_id', childId)
      .eq('season_id', seasonId)
      .eq('present', true)
      .order('session_date', { ascending: false })
      .limit(30);

    // Build a sorted list of present dates
    const presentDates = (recentAtt ?? [])
      .map((a: any) => a.session_date)
      .filter((d: string) => d !== sessionDate)
      .sort()
      .reverse();

    // Count consecutive weeks (7-day intervals)
    let streak = 1;
    let prev = new Date(sessionDate + 'T00:00:00');
    for (const dateStr of presentDates) {
      const d = new Date(dateStr + 'T00:00:00');
      const diff = Math.round((prev.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 6 && diff <= 8) {
        streak++;
        prev = d;
      } else {
        break;
      }
    }
    consecutiveWeeks = streak;
  }

  let record;
  if (existing) {
    const { data } = await admin
      .from('children_ministry_attendance')
      .update({ present: present !== false, consecutive_weeks: consecutiveWeeks })
      .eq('id', existing.id)
      .select('*')
      .single();
    record = data;
  } else {
    const { data } = await admin
      .from('children_ministry_attendance')
      .insert({ church_id: churchId, season_id: seasonId, child_id: childId, session_date: sessionDate, present: present !== false, consecutive_weeks: consecutiveWeeks })
      .select('*')
      .single();
    record = data;
  }

  // Auto-award streak bonus if milestone hit and not already awarded
  if (present !== false && STREAK_BONUSES[consecutiveWeeks]) {
    const bonusPoints = STREAK_BONUSES[consecutiveWeeks];

    const { count } = await admin
      .from('children_ministry_points')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('season_id', seasonId)
      .eq('category', 'streak_bonus')
      .eq('points', bonusPoints);

    if ((count ?? 0) === 0) {
      // Get team
      const { data: membership } = await admin
        .from('children_ministry_team_members')
        .select('team_id')
        .eq('child_id', childId)
        .eq('season_id', seasonId)
        .maybeSingle();

      const teamId = membership?.team_id ?? null;

      await admin.from('children_ministry_points').insert({
        church_id: churchId,
        season_id: seasonId,
        team_id: teamId,
        child_id: childId,
        category: 'streak_bonus',
        points: bonusPoints,
        awarded_by: user.id,
        note: `${consecutiveWeeks}-week attendance streak bonus`,
      });

      if (teamId) {
        const { data: teamData } = await admin.from('children_ministry_teams').select('total_points').eq('id', teamId).single();
        await admin.from('children_ministry_teams').update({ total_points: Number(teamData?.total_points ?? 0) + bonusPoints }).eq('id', teamId);
      }
    }
  }

  return Response.json({ record, consecutiveWeeks, streakBonusAwarded: !!(present !== false && STREAK_BONUSES[consecutiveWeeks]) });
}
