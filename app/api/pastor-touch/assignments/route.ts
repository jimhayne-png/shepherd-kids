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
  const pastorId = req.nextUrl.searchParams.get('pastor_id');
  const weekParam = req.nextUrl.searchParams.get('week');
  const weekNumber = weekParam === 'current' ? getISOWeek() : weekParam ? parseInt(weekParam) : null;

  const admin = adminClient();

  let query = admin.from('annual_pastor_touch_assignments').select('*').eq('church_id', churchId).eq('year', year);
  if (pastorId) query = query.eq('pastor_id', pastorId);
  if (weekNumber) query = query.eq('week_number', weekNumber);
  query = query.order('week_number').order('member_id');

  const { data: assignments, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!assignments?.length) return Response.json({ assignments: [], current_week: getISOWeek() });

  // Enrich with member details
  const memberIds = [...new Set(assignments.map((a: any) => a.member_id))];
  const { data: members } = await admin.from('members').select('id, first_name, last_name, phone, address, city, state, zip').in('id', memberIds);
  const memberMap: Record<string, any> = {};
  for (const m of members ?? []) memberMap[m.id] = m;

  // Enrich with log status
  const { data: logs } = await admin.from('annual_pastor_touch_log').select('member_id, call_done, letter_done, prayer_done').eq('church_id', churchId).eq('year', year).in('member_id', memberIds);
  const logMap: Record<string, any> = {};
  for (const l of logs ?? []) logMap[l.member_id] = l;

  // Enrich with pastor info
  const pastorIds = [...new Set(assignments.map((a: any) => a.pastor_id))];
  const { data: staff } = await admin.from('pastoral_staff').select('id, name, title').in('id', pastorIds);
  const staffMap: Record<string, any> = {};
  for (const s of staff ?? []) staffMap[s.id] = s;

  const enriched = assignments.map((a: any) => ({
    ...a,
    member: memberMap[a.member_id] ?? null,
    pastor: staffMap[a.pastor_id] ?? null,
    log: logMap[a.member_id] ?? { call_done: false, letter_done: false, prayer_done: false },
  }));

  return Response.json({ assignments: enriched, current_week: getISOWeek() });
}
