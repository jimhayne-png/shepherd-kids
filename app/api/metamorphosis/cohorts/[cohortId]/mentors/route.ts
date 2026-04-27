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

const VALID_JUNIOR_GRADES = new Set(['11th', '12th']);

export async function GET(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient().from('metamorphosis_mentors').select('*').eq('cohort_id', cohortId).eq('church_id', churchId).order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ mentors: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const { member_id, first_name, last_name, grade, age, mentor_type } = body;
  if (!first_name?.trim() || !last_name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });
  if (!mentor_type) return Response.json({ error: 'mentor_type required' }, { status: 400 });

  const admin = adminClient();

  // Validate based on mentor type
  if (mentor_type === 'junior_mentor') {
    // Must be 11th or 12th grade — verify via high-school roster pipeline_stage or grade field
    if (!grade || !VALID_JUNIOR_GRADES.has(grade)) {
      return Response.json({
        error: `Junior cohort mentors must be 11th or 12th grade. Grade "${grade}" is not eligible. Please select a mentor from the High School roster who is in 11th or 12th grade.`,
      }, { status: 400 });
    }
  } else if (mentor_type === 'senior_mentor') {
    // Must be from young-adults roster — if member_id provided, verify
    if (member_id) {
      const { data: rosterEntry } = await admin
        .from('ministry_rosters')
        .select('id')
        .eq('church_id', churchId)
        .eq('ministry_type', 'young-adults')
        .eq('member_id', member_id)
        .eq('status', 'active')
        .maybeSingle();
      if (!rosterEntry) {
        return Response.json({
          error: 'Senior cohort mentors must be active members of the Young Adults ministry. This member is not on the Young Adults roster.',
        }, { status: 400 });
      }
    }
  }

  const { data, error } = await admin.from('metamorphosis_mentors').insert({
    church_id: churchId, cohort_id: cohortId,
    member_id: member_id || null,
    first_name: first_name.trim(), last_name: last_name.trim(),
    grade: grade?.trim() || null,
    age: age ? Number(age) : null,
    mentor_type,
    assigned_student_ids: [],
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ mentor: data });
}
