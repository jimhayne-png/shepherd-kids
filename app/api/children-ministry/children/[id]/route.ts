import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const admin = adminClient();

  const { data: child, error } = await admin.from('children_ministry_children').select('*').eq('id', id).eq('church_id', churchId).maybeSingle();
  if (error || !child) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ child });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.firstName !== undefined) updates.first_name = body.firstName.trim();
  if (body.lastName !== undefined) updates.last_name = body.lastName.trim();
  if (body.grade !== undefined) updates.grade = body.grade;
  if (body.dateOfBirth !== undefined) updates.date_of_birth = body.dateOfBirth || null;
  if (body.allergies !== undefined) updates.allergies = body.allergies?.trim() || null;
  if (body.medicalNotes !== undefined) updates.medical_notes = body.medicalNotes?.trim() || null;
  if (body.parent1Name !== undefined) updates.parent1_name = body.parent1Name?.trim() || null;
  if (body.parent1Email !== undefined) updates.parent1_email = body.parent1Email?.trim() || null;
  if (body.parent1Phone !== undefined) updates.parent1_phone = body.parent1Phone?.trim() || null;
  if (body.parent2Name !== undefined) updates.parent2_name = body.parent2Name?.trim() || null;
  if (body.parent2Email !== undefined) updates.parent2_email = body.parent2Email?.trim() || null;
  if (body.parent2Phone !== undefined) updates.parent2_phone = body.parent2Phone?.trim() || null;
  if (body.authorizedPickups !== undefined) updates.authorized_pickups = Array.isArray(body.authorizedPickups) ? body.authorizedPickups.filter(Boolean) : [];
  if (body.photoPermission !== undefined) updates.photo_permission = body.photoPermission;
  if (body.active !== undefined) updates.active = body.active;

  const { data, error } = await adminClient().from('children_ministry_children').update(updates).eq('id', id).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ child: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const { error } = await adminClient().from('children_ministry_children').update({ active: false }).eq('id', id).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
