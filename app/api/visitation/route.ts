import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}

async function getChurchId(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.church_id ?? null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const [membersRes, logsRes, settingsRes, staffRes, assignmentsRes] = await Promise.all([
    adminClient()
      .from('members')
      .select(`
        id, first_name, last_name, photo_url, member_type,
        last_contacted_at,
        member_departments(department_id, departments(id, name))
      `)
      .eq('church_id', churchId)
      .eq('status', 'active')
      .order('last_name'),

    adminClient()
      .from('visitation_logs')
      .select('member_id, contact_type, contact_date, assigned_to, follow_up_at, follow_up_notes')
      .eq('church_id', churchId)
      .order('contact_date', { ascending: false }),

    adminClient()
      .from('visitation_settings')
      .select('connection_threshold_days, weekly_digest')
      .eq('church_id', churchId)
      .maybeSingle(),

    adminClient()
      .from('visitation_staff')
      .select('id, member_id, role, members(first_name, last_name)')
      .eq('church_id', churchId),

    adminClient()
      .from('visitation_assignments')
      .select('member_id, staff_member_id')
      .eq('church_id', churchId),
  ]);

  const threshold = settingsRes.data?.connection_threshold_days ?? 30;

  // Most recent log per member
  const logMap = new Map<string, any>();
  for (const log of (logsRes.data ?? [])) {
    if (!logMap.has(log.member_id)) logMap.set(log.member_id, log);
  }

  // Assignment map
  const assignMap = new Map<string, string>();
  for (const a of (assignmentsRes.data ?? [])) {
    assignMap.set(a.member_id, a.staff_member_id);
  }

  const now = new Date();

  const members = (membersRes.data ?? []).map((m: any) => {
    const lastLog = logMap.get(m.id);
    const lastContactedAt = m.last_contacted_at ?? null;
    const daysSince = lastContactedAt
      ? Math.floor((now.getTime() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const depts = (m.member_departments ?? []).map((md: any) => md.departments).filter(Boolean);

    return {
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      photo_url: m.photo_url ?? null,
      member_type: m.member_type,
      last_contacted_at: lastContactedAt,
      days_since_contact: daysSince,
      last_contact_type: lastLog?.contact_type ?? null,
      follow_up_at: lastLog?.follow_up_at ?? null,
      follow_up_notes: lastLog?.follow_up_notes ?? null,
      assigned_staff_id: assignMap.get(m.id) ?? null,
      departments: depts,
    };
  });

  // Sort: never contacted first, then most overdue
  members.sort((a: any, b: any) => {
    if (a.days_since_contact === null && b.days_since_contact === null) return 0;
    if (a.days_since_contact === null) return -1;
    if (b.days_since_contact === null) return 1;
    return b.days_since_contact - a.days_since_contact;
  });

  return Response.json({
    members,
    settings: {
      connection_threshold_days: threshold,
      weekly_digest: settingsRes.data?.weekly_digest ?? false,
    },
    staff: staffRes.data ?? [],
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { memberId, staffMemberId } = await request.json();
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  const { error } = await adminClient()
    .from('visitation_assignments')
    .upsert(
      { church_id: churchId, member_id: memberId, staff_member_id: staffMemberId ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'church_id,member_id' }
    );

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
