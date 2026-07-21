import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { isAdminRole } from '@/lib/staff-permissions';
import { getFamilyForChurch, logChurchAudit } from '@/lib/children-ministry/family-care';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(auth.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await getFamilyForChurch(id, auth.churchId);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const updateData: Record<string, unknown> = {};
  const isArchive = body?.archive === true;

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

  const { error } = await adminClient()
    .from('cm_family_sensitive_notes')
    .update(updateData)
    .eq('id', noteId)
    .eq('family_id', id)
    .eq('church_id', auth.churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logChurchAudit({
    churchId: auth.churchId,
    actorId: auth.userId,
    action: isArchive ? 'family_sensitive_note_archived' : 'family_sensitive_note_updated',
    targetId: id,
    details: { noteId },
  });

  return Response.json({ ok: true });
}
