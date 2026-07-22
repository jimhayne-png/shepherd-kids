import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can, isAdminRole } from '@/lib/staff-permissions';

async function getChildForChurch(childId: string, churchId: string) {
  const admin = adminClient();
  const { data } = await admin
    .from('cm_visitor_children')
    .select('id')
    .eq('id', childId)
    .eq('church_id', churchId)
    .maybeSingle();
  return data as { id: string } | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const isArchive = body?.archive === true;

  if (isArchive) {
    if (!isAdminRole(auth.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  } else if (!can(auth.role, 'access_children_ministry')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const child = await getChildForChurch(id, auth.churchId);
  if (!child) return Response.json({ error: 'Not found' }, { status: 404 });

  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 });

  const updateData: Record<string, unknown> = {};

  if (typeof body?.noteText === 'string') {
    const noteText = body.noteText.trim();
    if (!noteText) return Response.json({ error: 'noteText cannot be empty' }, { status: 400 });
    updateData.note_text = noteText;
    updateData.updated_at = new Date().toISOString();
  }

  if (isArchive) {
    updateData.archived_at = new Date().toISOString();
    updateData.archived_by = auth.userId;
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: 'No changes provided' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('cm_child_care_notes')
    .update(updateData)
    .eq('id', noteId)
    .eq('child_id', id)
    .eq('church_id', auth.churchId)
    .select('id');

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!data || data.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ ok: true });
}
