import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ podId: string }> }) {
  const { podId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();

  const { data: memberships } = await admin.from('bible_study_pod_members').select('member_id').eq('pod_id', podId);
  const memberIds = (memberships ?? []).map((m: any) => m.member_id);

  const { data: members } = await admin.from('members').select('id, first_name, last_name').in('id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']);

  const sortedMembers = (members ?? []).sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data: records } = await admin.from('bible_study_pod_attendance').select('member_id, session_date, present').eq('pod_id', podId).gte('session_date', since.toISOString().slice(0, 10)).order('session_date', { ascending: false });

  const dateSet = new Set<string>();
  for (const r of records ?? []) dateSet.add(r.session_date);
  const sessions = Array.from(dateSet).sort().reverse().slice(0, 8);

  return Response.json({ members: sortedMembers, sessions, records: records ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ podId: string }> }) {
  const { podId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { member_id, session_date, present } = await request.json();
  if (!member_id || !session_date) return Response.json({ error: 'member_id and session_date required' }, { status: 400 });

  const admin = adminClient();
  const { data: existing } = await admin.from('bible_study_pod_attendance').select('id').eq('pod_id', podId).eq('member_id', member_id).eq('session_date', session_date).maybeSingle();

  let record;
  if (existing) {
    const { data } = await admin.from('bible_study_pod_attendance').update({ present: present !== false }).eq('id', existing.id).select('*').single();
    record = data;
  } else {
    const { data } = await admin.from('bible_study_pod_attendance').insert({ church_id: churchId, pod_id: podId, member_id, session_date, present: present !== false }).select('*').single();
    record = data;
  }
  return Response.json({ record });
}
