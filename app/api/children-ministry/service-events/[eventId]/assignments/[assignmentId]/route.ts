import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string; assignmentId: string }> }) {
  const { assignmentId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await req.json();
  const admin = adminClient();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

  const { data, error } = await admin.from('cm_volunteer_assignments').update(updates).eq('id', assignmentId).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Decrement reliability on no_show
  if (body.status === 'no_show') {
    const { data: vol } = await admin.from('cm_volunteers').select('reliability_score').eq('id', data.volunteer_id).maybeSingle();
    if (vol) {
      await admin.from('cm_volunteers').update({ reliability_score: Math.max(0, (vol.reliability_score ?? 100) - 10) }).eq('id', data.volunteer_id);
    }
  }

  return Response.json({ assignment: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string; assignmentId: string }> }) {
  const { assignmentId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const { error } = await adminClient().from('cm_volunteer_assignments').delete().eq('id', assignmentId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
