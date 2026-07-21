import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can } from '@/lib/staff-permissions';
import { getFamilyForChurch, getActorName } from '@/lib/children-ministry/family-care';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(auth.role, 'access_children_ministry')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await getFamilyForChurch(id, auth.churchId);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await adminClient()
    .from('cm_family_care_notes')
    .select('id, note_text, created_by, created_by_name, created_at, updated_at')
    .eq('family_id', id)
    .eq('church_id', auth.churchId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ notes: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(auth.role, 'access_children_ministry')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await getFamilyForChurch(id, auth.churchId);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const noteText = String(body?.noteText ?? '').trim();
  if (!noteText) return Response.json({ error: 'noteText is required' }, { status: 400 });

  const actorName = await getActorName(auth.userId);

  const { data, error } = await adminClient()
    .from('cm_family_care_notes')
    .insert({
      church_id: auth.churchId,
      family_id: id,
      note_text: noteText,
      created_by: auth.userId,
      created_by_name: actorName,
    })
    .select('id, note_text, created_by, created_by_name, created_at, updated_at')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ note: data });
}
