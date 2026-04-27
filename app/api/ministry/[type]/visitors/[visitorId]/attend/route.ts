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

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string; visitorId: string }> }) {
  const { visitorId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: visitor } = await admin.from('ministry_visitors').select('visit_count').eq('id', visitorId).eq('church_id', churchId).maybeSingle();
  if (!visitor) return Response.json({ error: 'Visitor not found' }, { status: 404 });

  const newCount = (visitor.visit_count ?? 1) + 1;
  const flagged = newCount >= 3;

  const { data, error } = await admin.from('ministry_visitors')
    .update({
      visit_count: newCount,
      last_visit_date: today,
      status: flagged ? 'flagged' : 'visitor',
    })
    .eq('id', visitorId)
    .eq('church_id', churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ visitor: data, flagged });
}
