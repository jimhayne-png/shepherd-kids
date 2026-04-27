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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cohortId: string; mentorId: string }> }) {
  const { mentorId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { student_ids } = await req.json();
  if (!Array.isArray(student_ids)) return Response.json({ error: 'student_ids must be an array' }, { status: 400 });
  if (student_ids.length > 3) return Response.json({ error: 'Maximum 3 students per mentor' }, { status: 400 });

  const { data, error } = await adminClient()
    .from('metamorphosis_mentors')
    .update({ assigned_student_ids: student_ids })
    .eq('id', mentorId)
    .eq('church_id', churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ mentor: data });
}
