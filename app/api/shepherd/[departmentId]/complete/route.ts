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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const { departmentId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { assignment_id, notes, completed } = body;

  if (!assignment_id) return Response.json({ error: 'assignment_id required' }, { status: 400 });

  const admin = adminClient();

  // Verify the assignment belongs to this department
  const { data: existing } = await admin
    .from('shepherd_assignments')
    .select('id, department_id')
    .eq('id', assignment_id)
    .eq('department_id', departmentId)
    .maybeSingle();

  if (!existing) return Response.json({ error: 'Assignment not found' }, { status: 404 });

  const updates: Record<string, any> = {};
  if (completed === false) {
    updates.completed_at = null;
    updates.completed_by = null;
  } else {
    updates.completed_at = new Date().toISOString();
    updates.completed_by = user.id;
  }
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  const { error } = await admin
    .from('shepherd_assignments')
    .update(updates)
    .eq('id', assignment_id);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ success: true });
}
