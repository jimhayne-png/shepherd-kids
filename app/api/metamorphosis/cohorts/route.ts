import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }
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

  const ministryType = req.nextUrl.searchParams.get('ministry_type');
  const admin = adminClient();

  let query = admin.from('metamorphosis_cohorts').select('*').eq('church_id', churchId).order('start_date', { ascending: false });
  // filter by sending ministry if requested (stored in notes or name convention)
  // We store ministry_type on each cohort via notes — but let's add a filter via cohort_type mapping
  const { data: cohorts, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const cohortIds = (cohorts ?? []).map((c: any) => c.id);
  const [studentsRes, mentorsRes] = await Promise.all([
    cohortIds.length ? admin.from('metamorphosis_students').select('cohort_id').in('cohort_id', cohortIds) : { data: [] },
    cohortIds.length ? admin.from('metamorphosis_mentors').select('cohort_id').in('cohort_id', cohortIds) : { data: [] },
  ]);

  const studentCount: Record<string, number> = {};
  const mentorCount: Record<string, number> = {};
  for (const s of studentsRes.data ?? []) studentCount[s.cohort_id] = (studentCount[s.cohort_id] ?? 0) + 1;
  for (const m of mentorsRes.data ?? []) mentorCount[m.cohort_id] = (mentorCount[m.cohort_id] ?? 0) + 1;

  const enriched = (cohorts ?? []).map((c: any) => ({
    ...c,
    student_count: studentCount[c.id] ?? 0,
    mentor_count: mentorCount[c.id] ?? 0,
  }));

  // Filter by ministry_type if provided (stored in name/cohort_type mapping)
  const filtered = ministryType
    ? enriched.filter((c: any) => {
        if (ministryType === 'childrens') return c.cohort_type === 'junior';
        if (ministryType === 'middle-school') return c.cohort_type === 'senior';
        return true;
      })
    : enriched;

  return Response.json({ cohorts: filtered });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { name, cohort_type, start_date, notes } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });
  if (!cohort_type || !['junior', 'senior'].includes(cohort_type)) return Response.json({ error: 'cohort_type must be junior or senior' }, { status: 400 });
  if (!start_date) return Response.json({ error: 'start_date required' }, { status: 400 });

  // end_date = start_date + 42 days
  const endDate = new Date(start_date + 'T00:00:00');
  endDate.setDate(endDate.getDate() + 42);
  const end_date = endDate.toISOString().slice(0, 10);

  const admin = adminClient();
  const { data: cohort, error } = await admin.from('metamorphosis_cohorts').insert({
    church_id: churchId, name: name.trim(), cohort_type, start_date, end_date,
    status: 'upcoming', notes: notes?.trim() || null,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Auto-create 6 weekly sessions
  const sessions = [];
  for (let i = 1; i <= 6; i++) {
    const sessionDate = new Date(start_date + 'T00:00:00');
    sessionDate.setDate(sessionDate.getDate() + (i - 1) * 7);
    sessions.push({ church_id: churchId, cohort_id: cohort.id, week_number: i, session_date: sessionDate.toISOString().slice(0, 10) });
  }
  await admin.from('metamorphosis_sessions').insert(sessions);

  return Response.json({ cohort });
}
