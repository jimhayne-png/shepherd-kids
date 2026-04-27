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

export async function POST(req: NextRequest, { params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();

  const { data: family } = await admin
    .from('cm_visitor_families')
    .select('*')
    .eq('id', familyId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!family) return Response.json({ error: 'Family not found' }, { status: 404 });

  const { data: visitorChildren } = await admin
    .from('cm_visitor_children')
    .select('*')
    .eq('family_id', familyId);

  if (!visitorChildren?.length) {
    return Response.json({ error: 'No children found for this family' }, { status: 400 });
  }

  // Convert each visitor child to a full children_ministry_children record
  const cmChildren = visitorChildren.map((c: any) => ({
    church_id: churchId,
    first_name: c.first_name,
    last_name: c.last_name,
    grade: c.grade ?? '3rd',
    date_of_birth: c.date_of_birth ?? null,
    allergies: c.allergies ?? null,
    medical_notes: c.medical_notes ?? null,
    parent1_name: `${family.parent1_first_name} ${family.parent1_last_name}`.trim(),
    parent1_email: family.parent1_email ?? null,
    parent1_phone: family.parent1_phone ?? null,
    parent2_name: family.parent2_first_name ? `${family.parent2_first_name} ${family.parent2_last_name ?? ''}`.trim() : null,
    parent2_email: family.parent2_email ?? null,
    parent2_phone: family.parent2_phone ?? null,
    authorized_pickups: [],
    photo_permission: false,
    active: true,
  }));

  const { data: created, error: insertErr } = await admin
    .from('children_ministry_children')
    .insert(cmChildren)
    .select('id, first_name, last_name');

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 400 });

  // Update family status to converted
  await admin
    .from('cm_visitor_families')
    .update({ status: 'converted' })
    .eq('id', familyId);

  return Response.json({ success: true, children: created ?? [] });
}
