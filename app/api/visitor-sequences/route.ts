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

  const admin = adminClient();

  const { data: sequences, error } = await admin
    .from('visitor_sequences')
    .select('id, name, department_id, is_active, created_at')
    .eq('church_id', churchId)
    .order('created_at');

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Get step counts
  const ids = (sequences ?? []).map((s: any) => s.id);
  let stepCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: steps } = await admin
      .from('visitor_sequence_steps')
      .select('sequence_id')
      .in('sequence_id', ids);
    for (const s of steps ?? []) {
      stepCounts[s.sequence_id] = (stepCounts[s.sequence_id] ?? 0) + 1;
    }
  }

  // Get enrollment counts
  let enrollCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: enrs } = await admin
      .from('visitor_sequence_enrollments')
      .select('sequence_id')
      .in('sequence_id', ids)
      .eq('status', 'active');
    for (const e of enrs ?? []) {
      enrollCounts[e.sequence_id] = (enrollCounts[e.sequence_id] ?? 0) + 1;
    }
  }

  // Get department names
  const deptIds = [...new Set((sequences ?? []).map((s: any) => s.department_id).filter(Boolean))];
  let deptNames: Record<string, string> = {};
  if (deptIds.length > 0) {
    const { data: depts } = await admin
      .from('departments')
      .select('id, name')
      .in('id', deptIds);
    for (const d of depts ?? []) deptNames[d.id] = d.name;
  }

  const result = (sequences ?? []).map((s: any) => ({
    ...s,
    step_count: stepCounts[s.id] ?? 0,
    active_enrollments: enrollCounts[s.id] ?? 0,
    department_name: s.department_id ? (deptNames[s.department_id] ?? 'Unknown') : null,
  }));

  return Response.json({ sequences: result });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { name, departmentId } = body;

  if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 });

  const { data, error } = await adminClient()
    .from('visitor_sequences')
    .insert({
      church_id: churchId,
      name: name.trim(),
      department_id: departmentId || null,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, id: data.id });
}
