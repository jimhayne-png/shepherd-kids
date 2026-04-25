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

async function verifySequenceOwnership(sequenceId: string, churchId: string) {
  const { data } = await adminClient()
    .from('visitor_sequences')
    .select('id')
    .eq('id', sequenceId)
    .eq('church_id', churchId)
    .maybeSingle();
  return !!data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id: sequenceId, stepId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  if (!await verifySequenceOwnership(sequenceId, churchId)) {
    return Response.json({ error: 'Sequence not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, any> = {};
  if (body.dayOffset !== undefined) updates.day_offset = body.dayOffset;
  if (body.stepType !== undefined) updates.step_type = body.stepType;
  if (body.emailSubject !== undefined) updates.email_subject = body.emailSubject;
  if (body.emailBody !== undefined) updates.email_body = body.emailBody;
  if (body.taskDescription !== undefined) updates.task_description = body.taskDescription;
  if (body.assignedToRole !== undefined) updates.assigned_to_role = body.assignedToRole;

  const { error } = await adminClient()
    .from('visitor_sequence_steps')
    .update(updates)
    .eq('id', stepId)
    .eq('sequence_id', sequenceId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id: sequenceId, stepId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  if (!await verifySequenceOwnership(sequenceId, churchId)) {
    return Response.json({ error: 'Sequence not found' }, { status: 404 });
  }

  const { error } = await adminClient()
    .from('visitor_sequence_steps')
    .delete()
    .eq('id', stepId)
    .eq('sequence_id', sequenceId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
