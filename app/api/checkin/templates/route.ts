import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data } = await admin.from('church_users').select('church_id').eq('user_id', user.id).maybeSingle();
  if (!data?.church_id) return null;
  return { userId: user.id, churchId: data.church_id as string };
}

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await adminClient()
    .from('cm_service_templates')
    .select('*')
    .eq('church_id', auth.churchId)
    .order('name');

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ templates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, typicalDay, typicalTime } = await request.json();
  if (!name) return Response.json({ error: 'name required' }, { status: 400 });

  const { data, error } = await adminClient()
    .from('cm_service_templates')
    .insert({ church_id: auth.churchId, name, typical_day: typicalDay ?? null, typical_time: typicalTime ?? null })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ template: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...fields } = await request.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.typicalDay !== undefined) updates.typical_day = fields.typicalDay;
  if (fields.typicalTime !== undefined) updates.typical_time = fields.typicalTime;
  if (fields.isActive !== undefined) updates.is_active = fields.isActive;

  const { data, error } = await adminClient()
    .from('cm_service_templates')
    .update(updates)
    .eq('id', id)
    .eq('church_id', auth.churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ template: data });
}
