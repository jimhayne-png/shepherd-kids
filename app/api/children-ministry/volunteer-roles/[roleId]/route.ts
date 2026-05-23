import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.color !== undefined) updates.color = body.color;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  const { data, error } = await adminClient().from('cm_volunteer_roles').update(updates).eq('id', roleId).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ role: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const { error } = await adminClient().from('cm_volunteer_roles').delete().eq('id', roleId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
