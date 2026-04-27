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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const ministryType = request.nextUrl.searchParams.get('ministry_type');
  const admin = adminClient();

  let query = admin.from('bible_study_pods').select('*').eq('church_id', churchId).order('created_at', { ascending: false });
  if (ministryType) query = query.eq('ministry_type', ministryType);
  const statusFilter = request.nextUrl.searchParams.get('status');
  if (statusFilter) query = query.eq('status', statusFilter);

  const { data: pods, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!pods?.length) return Response.json({ pods: [], total_pods: 0, total_members: 0 });

  const podIds = pods.map((p: any) => p.id);

  // Member counts
  const { data: memberships } = await admin.from('bible_study_pod_members').select('pod_id, member_id').in('pod_id', podIds);
  const memberCountMap: Record<string, number> = {};
  const memberIdsByPod: Record<string, string[]> = {};
  for (const m of memberships ?? []) {
    memberCountMap[m.pod_id] = (memberCountMap[m.pod_id] ?? 0) + 1;
    if (!memberIdsByPod[m.pod_id]) memberIdsByPod[m.pod_id] = [];
    memberIdsByPod[m.pod_id].push(m.member_id);
  }

  // Last attendance date per pod
  const { data: recentAtt } = await admin
    .from('bible_study_pod_attendance')
    .select('pod_id, session_date')
    .in('pod_id', podIds)
    .order('session_date', { ascending: false });

  const lastAttMap: Record<string, string> = {};
  for (const a of recentAtt ?? []) {
    if (!lastAttMap[a.pod_id]) lastAttMap[a.pod_id] = a.session_date;
  }

  // Attendance rate (last 4 sessions per pod)
  const attRateMap: Record<string, number> = {};
  for (const podId of podIds) {
    const sessions = [...new Set((recentAtt ?? []).filter((a: any) => a.pod_id === podId).map((a: any) => a.session_date))].slice(0, 4);
    if (!sessions.length) { attRateMap[podId] = 0; continue; }
    const { data: attRecords } = await admin
      .from('bible_study_pod_attendance')
      .select('member_id, present')
      .eq('pod_id', podId)
      .in('session_date', sessions);
    const presentCount = (attRecords ?? []).filter((r: any) => r.present).length;
    const totalPossible = sessions.length * (memberCountMap[podId] ?? 1);
    attRateMap[podId] = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;
  }

  // Leader details
  const leaderIds = [...new Set(pods.map((p: any) => p.leader_member_id).filter(Boolean))];
  const { data: leaders } = await admin.from('members').select('id, first_name, last_name, email, phone').in('id', leaderIds.length ? leaderIds : ['00000000-0000-0000-0000-000000000000']);
  const leaderMap: Record<string, any> = {};
  for (const l of leaders ?? []) leaderMap[l.id] = l;

  const enriched = pods.map((p: any) => ({
    ...p,
    leader: p.leader_member_id ? (leaderMap[p.leader_member_id] ?? null) : null,
    member_count: memberCountMap[p.id] ?? 0,
    last_attendance_date: lastAttMap[p.id] ?? null,
    attendance_rate: attRateMap[p.id] ?? 0,
  }));

  const totalMembers = [...new Set((memberships ?? []).map((m: any) => m.member_id))].length;
  const activeThisWeek = Object.values(lastAttMap).filter(d => {
    const days = (Date.now() - new Date(d + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;
  const avgRate = enriched.length > 0 ? Math.round(enriched.reduce((s: number, p: any) => s + p.attendance_rate, 0) / enriched.length) : 0;

  return Response.json({ pods: enriched, total_pods: enriched.length, total_members: totalMembers, active_this_week: activeThisWeek, avg_attendance_rate: avgRate });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { name, description, leader_member_id, location_description, meeting_day, meeting_time, curriculum_name, ministry_type, curriculum_week } = body;
  if (!name?.trim()) return Response.json({ error: 'Pod name required' }, { status: 400 });

  const { data, error } = await adminClient().from('bible_study_pods').insert({
    church_id: churchId,
    name: name.trim(),
    description: description?.trim() || null,
    leader_member_id: leader_member_id || null,
    location_description: location_description?.trim() || null,
    meeting_day: meeting_day || null,
    meeting_time: meeting_time || null,
    curriculum_name: curriculum_name?.trim() || null,
    curriculum_week: curriculum_week ?? 1,
    ministry_type: ministry_type || null,
    status: 'active',
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ pod: data });
}
