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

  const { data: families, error } = await admin
    .from('cm_visitor_families')
    .select('id, parent1_first_name, parent1_last_name, parent1_phone, parent1_email, visit_date, status')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const familyIds = (families ?? []).map((f: any) => f.id as string);

  const { data: children } = familyIds.length
    ? await admin
        .from('cm_visitor_children')
        .select('id, family_id, first_name, last_name, date_of_birth')
        .in('family_id', familyIds)
        .order('created_at')
    : { data: [] };

  const childMap: Record<string, { first_name: string; last_name: string; date_of_birth: string | null }[]> = {};
  for (const c of children ?? []) {
    if (!childMap[c.family_id]) childMap[c.family_id] = [];
    childMap[c.family_id].push({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      date_of_birth: c.date_of_birth ?? null,
    });
  }

  const result = (families ?? []).map((f: any) => ({
    id: f.id,
    parent1_first_name: f.parent1_first_name,
    parent1_last_name: f.parent1_last_name,
    parent1_phone: f.parent1_phone ?? null,
    parent1_email: f.parent1_email ?? null,
    visit_date: f.visit_date,
    status: f.status,
    children: childMap[f.id] ?? [],
  }));

  return Response.json({ families: result });
}
