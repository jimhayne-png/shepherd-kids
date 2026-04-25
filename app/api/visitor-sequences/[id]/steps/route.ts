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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sequenceId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  if (!await verifySequenceOwnership(sequenceId, churchId)) {
    return Response.json({ error: 'Sequence not found' }, { status: 404 });
  }

  const body = await request.json();
  const { stepType, dayOffset, emailSubject, emailBody, taskDescription, assignedToRole } = body;

  if (!stepType || !['email', 'task'].includes(stepType)) {
    return Response.json({ error: 'stepType must be email or task' }, { status: 400 });
  }

  const admin = adminClient();

  // Get next step number
  const { data: existing } = await admin
    .from('visitor_sequence_steps')
    .select('step_number')
    .eq('sequence_id', sequenceId)
    .order('step_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const stepNumber = (existing?.step_number ?? 0) + 1;

  const { data, error } = await admin
    .from('visitor_sequence_steps')
    .insert({
      sequence_id: sequenceId,
      step_number: stepNumber,
      day_offset: dayOffset ?? 0,
      step_type: stepType,
      email_subject: emailSubject?.trim() || null,
      email_body: emailBody?.trim() || null,
      task_description: taskDescription?.trim() || null,
      assigned_to_role: assignedToRole || null,
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, id: data.id, stepNumber });
}
