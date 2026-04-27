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
  const { data: pod, error } = await admin.from('bible_study_pods').select('*').eq('id', podId).eq('church_id', churchId).maybeSingle();
  if (error || !pod) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: memberships } = await admin.from('bible_study_pod_members').select('member_id, joined_at').eq('pod_id', podId);
  const memberIds = (memberships ?? []).map((m: any) => m.member_id);
  const joinedMap: Record<string, string> = {};
  for (const m of memberships ?? []) joinedMap[m.member_id] = m.joined_at;

  const { data: members } = await admin.from('members').select('id, first_name, last_name, email, phone').in('id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']);

  // Per-member attendance rate
  const { data: attRecords } = await admin.from('bible_study_pod_attendance').select('member_id, session_date, present').eq('pod_id', podId).order('session_date', { ascending: false });
  const attMap: Record<string, { present: number; total: number }> = {};
  for (const r of attRecords ?? []) {
    if (!attMap[r.member_id]) attMap[r.member_id] = { present: 0, total: 0 };
    attMap[r.member_id].total++;
    if (r.present) attMap[r.member_id].present++;
  }

  const leader = pod.leader_member_id ? ((members ?? []).find((m: any) => m.id === pod.leader_member_id) ?? null) : null;

  const enrichedMembers = (members ?? []).map((m: any) => ({
    ...m,
    joined_at: joinedMap[m.id] ?? null,
    attendance_rate: attMap[m.id] ? Math.round((attMap[m.id].present / attMap[m.id].total) * 100) : 0,
  })).sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

  return Response.json({ pod: { ...pod, leader, member_count: memberIds.length }, members: enrichedMembers });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ podId: string }> }) {
  const { podId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.leader_member_id !== undefined) updates.leader_member_id = body.leader_member_id || null;
  if (body.location_description !== undefined) updates.location_description = body.location_description?.trim() || null;
  if (body.meeting_day !== undefined) updates.meeting_day = body.meeting_day || null;
  if (body.meeting_time !== undefined) updates.meeting_time = body.meeting_time || null;
  if (body.curriculum_name !== undefined) updates.curriculum_name = body.curriculum_name?.trim() || null;
  if (body.curriculum_week !== undefined) updates.curriculum_week = Number(body.curriculum_week);
  if (body.ministry_type !== undefined) updates.ministry_type = body.ministry_type || null;
  if (body.status !== undefined) updates.status = body.status;

  const { data, error } = await adminClient().from('bible_study_pods').update(updates).eq('id', podId).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ pod: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ podId: string }> }) {
  const { podId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  // Soft delete
  const { error } = await adminClient().from('bible_study_pods').update({ status: 'inactive' }).eq('id', podId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
