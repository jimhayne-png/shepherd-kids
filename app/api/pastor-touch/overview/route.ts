import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { getISOWeek, CURRENT_YEAR } from '@/lib/pastor-touch';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
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

  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(CURRENT_YEAR));
  const admin = adminClient();

  const [staffRes, assignRes, logRes] = await Promise.all([
    admin.from('pastoral_staff').select('*').eq('church_id', churchId).eq('active', true).order('name'),
    admin.from('annual_pastor_touch_assignments').select('pastor_id, member_id').eq('church_id', churchId).eq('year', year),
    admin.from('annual_pastor_touch_log').select('pastor_id, member_id, call_done, letter_done, prayer_done').eq('church_id', churchId).eq('year', year),
  ]);

  const staff = staffRes.data ?? [];
  const assignments = assignRes.data ?? [];
  const logs = logRes.data ?? [];

  // Build assignment count per pastor
  const assignCountMap: Record<string, number> = {};
  for (const a of assignments) assignCountMap[a.pastor_id] = (assignCountMap[a.pastor_id] ?? 0) + 1;

  // Build log stats per pastor
  const logStatMap: Record<string, { call: number; letter: number; prayer: number; complete: number }> = {};
  for (const l of logs) {
    if (!logStatMap[l.pastor_id]) logStatMap[l.pastor_id] = { call: 0, letter: 0, prayer: 0, complete: 0 };
    if (l.call_done) logStatMap[l.pastor_id].call++;
    if (l.letter_done) logStatMap[l.pastor_id].letter++;
    if (l.prayer_done) logStatMap[l.pastor_id].prayer++;
    if (l.call_done && l.letter_done && l.prayer_done) logStatMap[l.pastor_id].complete++;
  }

  const pastors = staff.map((s: any) => {
    const assigned = assignCountMap[s.id] ?? 0;
    const stats = logStatMap[s.id] ?? { call: 0, letter: 0, prayer: 0, complete: 0 };
    return {
      ...s,
      assigned_count: assigned,
      call_done: stats.call,
      letter_done: stats.letter,
      prayer_done: stats.prayer,
      complete_count: stats.complete,
      pct_complete: assigned > 0 ? Math.round((stats.complete / assigned) * 100) : 0,
    };
  });

  const totalAssigned = assignments.length;
  const totalComplete = logs.filter((l: any) => l.call_done && l.letter_done && l.prayer_done).length;

  return Response.json({
    pastors,
    total_assigned: totalAssigned,
    total_complete: totalComplete,
    pct_complete: totalAssigned > 0 ? Math.round((totalComplete / totalAssigned) * 100) : 0,
    current_week: getISOWeek(),
    year,
  });
}
