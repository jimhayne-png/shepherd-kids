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

  const { data, error } = await adminClient().from('metamorphosis_students').select('*').eq('cohort_id', cohortId).eq('church_id', churchId).order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ students: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { member_id, first_name, last_name, current_ministry, destination_ministry } = await req.json();
  if (!first_name?.trim() || !last_name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });

  const { data, error } = await adminClient().from('metamorphosis_students').insert({
    church_id: churchId, cohort_id: cohortId,
    member_id: member_id || null,
    first_name: first_name.trim(), last_name: last_name.trim(),
    current_ministry: current_ministry || null,
    destination_ministry: destination_ministry || null,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ student: data });
}
