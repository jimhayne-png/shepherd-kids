import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.color !== undefined) updates.color = body.color;
  if (body.mascot !== undefined) updates.mascot = body.mascot?.trim() || null;
  if (body.volunteerLeaderName !== undefined) updates.volunteer_leader_name = body.volunteerLeaderName?.trim() || null;
  if (body.volunteerLeaderEmail !== undefined) updates.volunteer_leader_email = body.volunteerLeaderEmail?.trim() || null;
  if (body.captainChildId !== undefined) updates.captain_child_id = body.captainChildId || null;
  if (body.coCaptainChildId !== undefined) updates.co_captain_child_id = body.coCaptainChildId || null;

  const { data, error } = await adminClient().from('children_ministry_teams').update(updates).eq('id', id).eq('church_id', churchId).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ team: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const { error } = await adminClient().from('children_ministry_teams').delete().eq('id', id).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
