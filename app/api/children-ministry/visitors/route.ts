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

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const status = req.nextUrl.searchParams.get('status');
  const dateFilter = req.nextUrl.searchParams.get('date');

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  let query = admin
    .from('cm_visitor_families')
    .select('*')
    .eq('church_id', churchId)
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (dateFilter === 'today') query = query.eq('visit_date', today);

  const { data: families, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const familyIds = (families ?? []).map((f: any) => f.id);
  const { data: children } = familyIds.length
    ? await admin.from('cm_visitor_children').select('*').in('family_id', familyIds).order('created_at')
    : { data: [] };

  const childMap: Record<string, any[]> = {};
  for (const c of children ?? []) {
    if (!childMap[c.family_id]) childMap[c.family_id] = [];
    childMap[c.family_id].push(c);
  }

  const enriched = (families ?? []).map((f: any) => ({
    ...f,
    children: childMap[f.id] ?? [],
  }));

  // Stats
  const allFamilies = await admin.from('cm_visitor_families').select('visit_date, status').eq('church_id', churchId);
  const all = allFamilies.data ?? [];
  const stats = {
    today: all.filter((f: any) => f.visit_date === today).length,
    this_week: all.filter((f: any) => f.visit_date >= weekAgo).length,
    this_month: all.filter((f: any) => f.visit_date >= monthAgo).length,
    converted: all.filter((f: any) => f.status === 'converted').length,
  };

  return Response.json({ families: enriched, stats });
}
