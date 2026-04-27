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

export async function GET(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const [cohortRes, studentsRes, mentorsRes, sessionsRes] = await Promise.all([
    admin.from('metamorphosis_cohorts').select('*').eq('id', cohortId).eq('church_id', churchId).maybeSingle(),
    admin.from('metamorphosis_students').select('*').eq('cohort_id', cohortId).order('created_at'),
    admin.from('metamorphosis_mentors').select('*').eq('cohort_id', cohortId).order('created_at'),
    admin.from('metamorphosis_sessions').select('*').eq('cohort_id', cohortId).order('week_number'),
  ]);

  if (!cohortRes.data) return Response.json({ error: 'Cohort not found' }, { status: 404 });
  return Response.json({ cohort: cohortRes.data, students: studentsRes.data ?? [], mentors: mentorsRes.data ?? [], sessions: sessionsRes.data ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.status !== undefined) updates.status = body.status;
  if (body.graduation_date !== undefined) updates.graduation_date = body.graduation_date || null;
  if (body.graduation_celebrated !== undefined) updates.graduation_celebrated = body.graduation_celebrated;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

  const { data, error } = await adminClient().from('metamorphosis_cohorts').update(updates).eq('id', cohortId).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ cohort: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  await Promise.all([
    admin.from('metamorphosis_students').delete().eq('cohort_id', cohortId),
    admin.from('metamorphosis_mentors').delete().eq('cohort_id', cohortId),
    admin.from('metamorphosis_sessions').delete().eq('cohort_id', cohortId),
    admin.from('metamorphosis_mentor_checkins').delete().eq('cohort_id', cohortId),
  ]);
  const { error } = await admin.from('metamorphosis_cohorts').delete().eq('id', cohortId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
