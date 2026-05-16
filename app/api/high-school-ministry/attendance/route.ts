import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return NextResponse.json({ error: 'No church found' }, { status: 403 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  // No sessionId — return list of sessions
  if (!sessionId) {
    const { data, error } = await adminClient()
      .from('high_school_checkin_sessions')
      .select('*')
      .eq('church_id', churchId)
      .order('date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sessions: data ?? [] });
  }

  // SessionId provided — return records + stats
  const { data: records, error: recordsErr } = await adminClient()
    .from('high_school_checkin_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('church_id', churchId)
    .order('checked_in_at', { ascending: false });

  if (recordsErr) return NextResponse.json({ error: recordsErr.message }, { status: 500 });
  if (!records || records.length === 0) {
    return NextResponse.json({ records: [], stats: { total: 0, newVisitors: 0, returning: 0 } });
  }

  const studentIds = [...new Set(records.map((r: any) => r.student_id).filter(Boolean))];
  const { data: students, error: studentsErr } = await adminClient()
    .from('high_school_students')
    .select('id, first_name, last_name, grade')
    .in('id', studentIds);

  if (studentsErr) return NextResponse.json({ error: studentsErr.message }, { status: 500 });

  const studentMap: Record<string, any> = {};
  for (const s of (students ?? [])) {
    studentMap[s.id] = s;
  }

  const enriched = records.map((r: any) => ({
    id: r.id,
    student_id: r.student_id,
    is_new_visitor: r.is_new_visitor,
    checked_in_at: r.checked_in_at,
    student: studentMap[r.student_id] ?? null,
  }));

  const total = enriched.length;
  const newVisitors = enriched.filter((r: any) => r.is_new_visitor).length;
  const returning = total - newVisitors;

  return NextResponse.json({
    records: enriched,
    stats: { total, newVisitors, returning },
  });
}
