import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

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
