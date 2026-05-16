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
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

  const { data: records, error: recordsErr } = await adminClient()
    .from('middle_school_checkin_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('church_id', churchId)
    .order('checked_in_at', { ascending: false });

  if (recordsErr) return NextResponse.json({ error: recordsErr.message }, { status: 500 });
  if (!records || records.length === 0) return NextResponse.json({ records: [] });

  const studentIds = [...new Set(records.map((r: any) => r.student_id).filter(Boolean))];
  const { data: students, error: studentsErr } = await adminClient()
    .from('middle_school_students')
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

  return NextResponse.json({ records: enriched });
}
