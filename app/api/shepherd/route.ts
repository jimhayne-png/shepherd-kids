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

async function getChurchUser(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id, role')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu || cu.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const admin = adminClient();
  const monthYear = currentMonthYear();

  const { data: departments, error } = await admin
    .from('departments')
    .select('id, name, icon, color')
    .eq('church_id', cu.church_id)
    .order('name');

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const deptIds = (departments ?? []).map((d: any) => d.id);

  const [leadersRes, assignmentsRes, settingsRes] = await Promise.all([
    admin
      .from('department_leaders')
      .select('department_id, member_id, members(first_name, last_name)')
      .in('department_id', deptIds.length ? deptIds : ['none']),
    admin
      .from('shepherd_assignments')
      .select('department_id, completed_at')
      .in('department_id', deptIds.length ? deptIds : ['none'])
      .eq('month_year', monthYear),
    admin
      .from('shepherd_settings')
      .select('department_id, frequency')
      .in('department_id', deptIds.length ? deptIds : ['none']),
  ]);

  const leaderMap: Record<string, any> = {};
  for (const l of leadersRes.data ?? []) {
    leaderMap[l.department_id] = l.members;
  }

  const assignMap: Record<string, { total: number; completed: number }> = {};
  for (const a of assignmentsRes.data ?? []) {
    if (!assignMap[a.department_id]) assignMap[a.department_id] = { total: 0, completed: 0 };
    assignMap[a.department_id].total++;
    if (a.completed_at) assignMap[a.department_id].completed++;
  }

  const settingsMap: Record<string, string> = {};
  for (const s of settingsRes.data ?? []) {
    settingsMap[s.department_id] = s.frequency;
  }

  const result = (departments ?? []).map((d: any) => {
    const counts = assignMap[d.id] ?? { total: 0, completed: 0 };
    const leader = leaderMap[d.id];
    return {
      ...d,
      leader_name: leader ? `${leader.first_name} ${leader.last_name}` : null,
      frequency: settingsMap[d.id] ?? 'monthly',
      month_year: monthYear,
      total_touches: counts.total,
      completed_touches: counts.completed,
      completion_rate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : null,
    };
  });

  return Response.json({ departments: result, month_year: monthYear });
}
