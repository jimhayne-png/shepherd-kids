import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string; assignmentId: string }> }) {
  const { assignmentId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

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
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });
  const { error } = await adminClient().from('cm_volunteer_assignments').delete().eq('id', assignmentId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
