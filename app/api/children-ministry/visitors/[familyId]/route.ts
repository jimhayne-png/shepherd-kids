import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() ?? null;

  const { data, error } = await adminClient()
    .from('cm_visitor_families')
    .update(updates)
    .eq('id', familyId)
    .eq('church_id', churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ family: data });
}
