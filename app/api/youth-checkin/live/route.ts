import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

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

function getMinistryTables(ministryType: string) {
  if (ministryType === 'middle-school') return {
    sessions: 'middle_school_checkin_sessions',
    records: 'middle_school_checkin_records',
    students: 'middle_school_students',
  };
  if (ministryType === 'high-school') return {
    sessions: 'high_school_checkin_sessions',
    records: 'high_school_checkin_records',
    students: 'high_school_students',
  };
  return {
    sessions: 'youth_checkin_sessions',
    records: 'youth_checkin_records',
    students: 'youth_students',
  };
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  const ministryType = url.searchParams.get('ministry_type') ?? 'youth';

  if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });

  const admin = adminClient();
  const tables = getMinistryTables(ministryType);

  const { data: records } = await admin
    .from(tables.records)
    .select('id, student_id, is_new_visitor, checked_in_at')
    .eq('session_id', sessionId)
    .eq('church_id', churchId)
    .order('checked_in_at', { ascending: false });

  if (!records?.length) return Response.json({ records: [] });

  const studentIds = records.map(r => r.student_id).filter(Boolean);
  const { data: students } = studentIds.length
    ? await admin.from(tables.students).select('id, first_name, last_name, grade').in('id', studentIds)
    : { data: [] };

  const studentMap: Record<string, any> = {};
  for (const s of students ?? []) studentMap[s.id] = s;

  const enriched = records.map(r => ({
    ...r,
    student: r.student_id ? (studentMap[r.student_id] ?? null) : null,
  }));

  return Response.json({ records: enriched });
}
