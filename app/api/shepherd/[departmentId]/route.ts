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

async function verifyDeptAccess(userId: string, departmentId: string, churchId: string) {
  const admin = adminClient();
  const { data: dept } = await admin
    .from('departments')
    .select('id')
    .eq('id', departmentId)
    .eq('church_id', churchId)
    .maybeSingle();
  if (!dept) return false;
  return true;
}

async function verifyLeaderAccess(userId: string, departmentId: string) {
  const { data } = await adminClient()
    .from('department_leaders')
    .select('department_id')
    .eq('user_id', userId)
    .eq('department_id', departmentId)
    .maybeSingle();
  return !!data;
}

function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const TOUCH_TYPES = ['email', 'phone', 'letter'] as const;

function getTouchType(rotationGroup: number, monthYear: string): string {
  const monthIndex = parseInt(monthYear.split('-')[1]) - 1;
  return TOUCH_TYPES[(rotationGroup + monthIndex) % 3];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const { departmentId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu) return Response.json({ error: 'No church found' }, { status: 403 });

  if (cu.role === 'admin') {
    const ok = await verifyDeptAccess(user.id, departmentId, cu.church_id);
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
  } else if (cu.role === 'ministry_leader') {
    const ok = await verifyLeaderAccess(user.id, departmentId);
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = adminClient();
  const monthYear = request.nextUrl.searchParams.get('month') ?? currentMonthYear();

  const [deptRes, assignRes, settingsRes, leaderRes] = await Promise.all([
    admin.from('departments').select('id, name, icon, color').eq('id', departmentId).single(),
    admin
      .from('shepherd_assignments')
      .select('id, member_id, touch_type, rotation_group, completed_at, completed_by, notes, members(first_name, last_name, photo_url, email, phone)')
      .eq('department_id', departmentId)
      .eq('month_year', monthYear),
    admin.from('shepherd_settings').select('frequency').eq('department_id', departmentId).maybeSingle(),
    admin
      .from('department_leaders')
      .select('member_id, user_id, members(first_name, last_name)')
      .eq('department_id', departmentId)
      .maybeSingle(),
  ]);

  if (deptRes.error) return Response.json({ error: deptRes.error.message }, { status: 400 });

  const nextMonth = (() => {
    const [y, m] = monthYear.split('-').map(Number);
    const d = new Date(y, m, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const { data: nextAssign } = await admin
    .from('shepherd_assignments')
    .select('member_id, touch_type, members(first_name, last_name)')
    .eq('department_id', departmentId)
    .eq('month_year', nextMonth);

  return Response.json({
    department: deptRes.data,
    assignments: assignRes.data ?? [],
    settings: settingsRes.data ?? { frequency: 'monthly' },
    leader: leaderRes.data ?? null,
    month_year: monthYear,
    next_month: nextMonth,
    next_assignments: nextAssign ?? [],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const { departmentId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu) return Response.json({ error: 'No church found' }, { status: 403 });

  // Only admin or leader of this dept can generate
  let allowed = false;
  if (cu.role === 'admin') {
    allowed = await verifyDeptAccess(user.id, departmentId, cu.church_id);
  } else if (cu.role === 'ministry_leader') {
    allowed = await verifyLeaderAccess(user.id, departmentId);
  }
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const monthYear = body.month_year ?? currentMonthYear();

  const admin = adminClient();

  // Check if assignments already exist for this month
  const { data: existing } = await admin
    .from('shepherd_assignments')
    .select('id')
    .eq('department_id', departmentId)
    .eq('month_year', monthYear)
    .limit(1);

  if (existing && existing.length > 0) {
    return Response.json({ error: 'Monthly outreach already launched for this month' }, { status: 409 });
  }

  // Check bimonthly frequency
  const { data: settings } = await admin
    .from('shepherd_settings')
    .select('frequency')
    .eq('department_id', departmentId)
    .maybeSingle();

  const frequency = settings?.frequency ?? 'monthly';
  if (frequency === 'bimonthly') {
    const monthNum = parseInt(monthYear.split('-')[1]);
    if (monthNum % 2 === 0) {
      return Response.json({ error: 'Bimonthly department — skipping even months' }, { status: 400 });
    }
  }

  // Get all members in the department
  const { data: deptMembers } = await admin
    .from('member_departments')
    .select('member_id')
    .eq('department_id', departmentId);

  if (!deptMembers || deptMembers.length === 0) {
    return Response.json({ error: 'No members in this department' }, { status: 400 });
  }

  // Get church_id from department
  const { data: dept } = await admin
    .from('departments')
    .select('church_id')
    .eq('id', departmentId)
    .single();

  if (!dept) return Response.json({ error: 'Department not found' }, { status: 404 });

  const now = new Date();
  const dueMonth = now.getMonth() + 1;
  const dueYear = now.getFullYear();
  const computedMonthYear = `${dueYear}-${String(dueMonth).padStart(2, '0')}`;

  // Split into 3 rotation groups by order
  const rows = deptMembers.map((m: any, i: number) => {
    const rotationGroup = i % 3;
    return {
      church_id: dept.church_id,
      department_id: departmentId,
      member_id: m.member_id,
      touch_type: getTouchType(rotationGroup, computedMonthYear),
      month_year: computedMonthYear,
      due_month: dueMonth,
      due_year: dueYear,
      rotation_group: rotationGroup,
    };
  });

  const { error: insertError } = await admin.from('shepherd_assignments').insert(rows);
  if (insertError) return Response.json({ error: insertError.message }, { status: 400 });

  return Response.json({ success: true, count: rows.length, month_year: monthYear });
}
