import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
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
  const auth = await getAuthContext(request);
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
  const auth = await getAuthContext(request);
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
