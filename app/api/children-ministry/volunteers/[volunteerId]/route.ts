import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) {
  const { volunteerId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.first_name !== undefined) updates.first_name = body.first_name.trim();
  if (body.last_name !== undefined) updates.last_name = body.last_name.trim();
  if (body.email !== undefined) updates.email = body.email?.trim() || null;
  if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
  if (body.roles !== undefined) updates.roles = Array.isArray(body.roles) ? body.roles : [];
  if (body.background_check_status !== undefined) updates.background_check_status = body.background_check_status;
  if (body.background_check_date !== undefined) updates.background_check_date = body.background_check_date || null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.reliability_score !== undefined) updates.reliability_score = Math.max(0, Math.min(100, Number(body.reliability_score)));

  const { data, error } = await adminClient().from('cm_volunteers').update(updates).eq('id', volunteerId).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ volunteer: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) {
  const { volunteerId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const { error } = await adminClient().from('cm_volunteers').update({ is_active: false }).eq('id', volunteerId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
