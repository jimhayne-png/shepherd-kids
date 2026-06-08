import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;
  const { milestoneId } = await params;

  const body = await request.json();
  const { completedAt, notes } = body as {
    completedAt?: string | null;
    notes?: string | null;
  };

  const admin = adminClient();

  const { error } = await admin
    .from('faith_milestones')
    .update({
      is_completed: !!completedAt,
      completed_at: completedAt || null,
      notes: notes?.trim() || null,
    })
    .eq('id', milestoneId)
    .eq('church_id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;
  const { milestoneId } = await params;

  const admin = adminClient();

  const { error } = await admin
    .from('faith_milestones')
    .delete()
    .eq('id', milestoneId)
    .eq('church_id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
