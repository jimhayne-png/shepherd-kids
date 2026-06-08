import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

type MilestoneRow = {
  id: string;
  milestone_type: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;
  const { id: childId } = await params;

  const admin = adminClient();

  const { data: child } = await admin
    .from('cm_visitor_children')
    .select('id')
    .eq('id', childId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!child) return Response.json({ error: 'Child not found' }, { status: 404 });

  const { data, error } = await admin
    .from('faith_milestones')
    .select('id, milestone_type, is_completed, completed_at, notes')
    .eq('church_id', churchId)
    .eq('child_id', childId)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ milestones: (data ?? []) as MilestoneRow[] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const { id: childId } = await params;

  const admin = adminClient();

  const { data: child } = await admin
    .from('cm_visitor_children')
    .select('id')
    .eq('id', childId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!child) return Response.json({ error: 'Child not found' }, { status: 404 });

  const body = await request.json();
  const { milestoneType, completedAt, notes } = body as {
    milestoneType: string;
    completedAt?: string | null;
    notes?: string | null;
  };

  if (!milestoneType) {
    return Response.json({ error: 'milestoneType is required' }, { status: 400 });
  }

  const { data: existing } = await admin
    .from('faith_milestones')
    .select('id')
    .eq('church_id', churchId)
    .eq('child_id', childId)
    .eq('milestone_type', milestoneType)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from('faith_milestones')
      .update({
        is_completed: !!completedAt,
        completed_at: completedAt || null,
        notes: notes?.trim() || null,
      })
      .eq('id', existing.id)
      .eq('church_id', churchId);

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true, id: existing.id });
  }

  const { data: created, error } = await admin
    .from('faith_milestones')
    .insert({
      church_id: churchId,
      child_id: childId,
      milestone_type: milestoneType,
      is_completed: !!completedAt,
      completed_at: completedAt || null,
      notes: notes?.trim() || null,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, id: created.id });
}
