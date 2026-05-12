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

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();

  if (type === 'childrens') {
    const { data: children, error } = await admin
      .from('cm_visitor_children')
      .select('id, first_name, last_name, date_of_birth, family_id')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 400 });

    const familyIds = [...new Set((children ?? []).map((c: any) => c.family_id as string).filter(Boolean))];

    const { data: families } = familyIds.length
      ? await admin
          .from('cm_visitor_families')
          .select('id, parent1_first_name, parent1_last_name, parent1_phone, parent1_email, visit_date, status')
          .in('id', familyIds)
      : { data: [] };

    const familyMap: Record<string, any> = {};
    for (const f of families ?? []) familyMap[f.id] = f;

    const result = (children ?? []).map((c: any) => {
      const fam = familyMap[c.family_id] ?? {};
      return {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        date_of_birth: c.date_of_birth ?? null,
        family_id: c.family_id,
        parent_name: [fam.parent1_first_name, fam.parent1_last_name].filter(Boolean).join(' ') || null,
        parent_phone: fam.parent1_phone ?? null,
        parent_email: fam.parent1_email ?? null,
        visit_date: fam.visit_date ?? null,
        status: fam.status ?? null,
      };
    });

    return Response.json({ visitors: result });
  }

  const { data, error } = await admin
    .from('ministry_visitors')
    .select('*')
    .eq('church_id', churchId)
    .eq('ministry_type', type)
    .order('last_visit_date', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ visitors: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { first_name, last_name, email, phone } = await req.json();
  if (!first_name?.trim() || !last_name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await adminClient().from('ministry_visitors').insert({
    church_id: churchId, ministry_type: type,
    first_name: first_name.trim(), last_name: last_name.trim(),
    email: email?.trim() || null, phone: phone?.trim() || null,
    visit_count: 1, first_visit_date: today, last_visit_date: today,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ visitor: data });
}
