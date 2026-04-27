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

export async function POST(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { mentor_id, student_id, week_number, notes } = await req.json();
  if (!mentor_id || !student_id || !week_number) return Response.json({ error: 'mentor_id, student_id, week_number required' }, { status: 400 });

  const { data, error } = await adminClient().from('metamorphosis_mentor_checkins').insert({
    church_id: churchId, cohort_id: cohortId,
    mentor_id, student_id, week_number: Number(week_number),
    checkin_date: new Date().toISOString().slice(0, 10),
    notes: notes?.trim() || null,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ checkin: data });
}
