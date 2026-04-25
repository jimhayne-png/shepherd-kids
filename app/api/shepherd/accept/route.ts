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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const departmentId = request.nextUrl.searchParams.get('department_id');
  if (!departmentId) return Response.json({ error: 'department_id required' }, { status: 400 });

  const admin = adminClient();
  const { data: dept } = await admin
    .from('departments')
    .select('id, name, church_id, churches(name)')
    .eq('id', departmentId)
    .single();

  if (!dept) return Response.json({ error: 'Department not found' }, { status: 404 });

  return Response.json({
    department_name: dept.name,
    church_name: (dept.churches as any)?.name ?? 'Your Church',
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { department_id } = body;
  if (!department_id) return Response.json({ error: 'department_id required' }, { status: 400 });

  const admin = adminClient();

  // Get department and its church
  const { data: dept } = await admin
    .from('departments')
    .select('id, church_id')
    .eq('id', department_id)
    .single();

  if (!dept) return Response.json({ error: 'Department not found' }, { status: 404 });

  // Get matching invitation
  const { data: invite } = await admin
    .from('department_invitations')
    .select('member_id')
    .eq('department_id', department_id)
    .maybeSingle();

  // Upsert church_users with ministry_leader role
  const { error: cuError } = await admin
    .from('church_users')
    .upsert({
      user_id: user.id,
      church_id: dept.church_id,
      role: 'ministry_leader',
    }, { onConflict: 'user_id' });

  if (cuError) return Response.json({ error: cuError.message }, { status: 400 });

  // Upsert department_leaders
  const { error: dlError } = await admin
    .from('department_leaders')
    .upsert({
      department_id: department_id,
      user_id: user.id,
      church_id: dept.church_id,
      member_id: invite?.member_id ?? null,
    }, { onConflict: 'department_id' });

  if (dlError) return Response.json({ error: dlError.message }, { status: 400 });

  return Response.json({ success: true, department_id });
}
