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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();

  const { data: visitor, error } = await admin
    .from('visitors')
    .select('*')
    .eq('id', id)
    .eq('church_id', churchId)
    .maybeSingle();

  if (error || !visitor) return Response.json({ error: 'Visitor not found' }, { status: 404 });

  const { data: enrollments } = await admin
    .from('visitor_sequence_enrollments')
    .select('id, sequence_id, status, current_step, enrolled_at, next_step_at, visitor_sequences(id, name)')
    .eq('visitor_id', id)
    .eq('church_id', churchId);

  // Fetch log for each enrollment
  const enrollmentIds = (enrollments ?? []).map((e: any) => e.id);
  let log: any[] = [];
  if (enrollmentIds.length > 0) {
    const { data: logData } = await admin
      .from('visitor_sequence_log')
      .select('id, enrollment_id, step_id, executed_at, result, visitor_sequence_steps(step_number, step_type, email_subject, task_description, day_offset)')
      .in('enrollment_id', enrollmentIds)
      .order('executed_at', { ascending: false });
    log = logData ?? [];
  }

  return Response.json({ visitor, enrollments: enrollments ?? [], log });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const updates: Record<string, any> = {};

  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.email !== undefined) updates.email = body.email;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.departmentId !== undefined) updates.department_id = body.departmentId;

  const { error } = await adminClient()
    .from('visitors')
    .update(updates)
    .eq('id', id)
    .eq('church_id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
