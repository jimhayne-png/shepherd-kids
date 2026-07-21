import { type NextRequest } from 'next/server';
import { adminClient, getAuthContextWithRole } from '@/lib/api-auth';
import { can } from '@/lib/staff-permissions';
import { getFamilyForChurch } from '@/lib/children-ministry/family-care';

const VALID_STATUSES = ['active', 'answered', 'archived'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  const { id, requestId } = await params;
  const auth = await getAuthContextWithRole(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(auth.role, 'access_children_ministry')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await getFamilyForChurch(id, auth.churchId);
  if (!family) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const updateData: Record<string, unknown> = {};

  if (typeof body?.requestText === 'string') {
    const requestText = body.requestText.trim();
    if (!requestText) return Response.json({ error: 'requestText cannot be empty' }, { status: 400 });
    updateData.request_text = requestText;
  }

  if (typeof body?.status === 'string') {
    if (!VALID_STATUSES.includes(body.status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }
    updateData.status = body.status;
    if (body.status === 'answered') {
      updateData.answered_at = new Date().toISOString();
    }
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: 'No changes provided' }, { status: 400 });
  }
  updateData.updated_at = new Date().toISOString();

  const { error } = await adminClient()
    .from('cm_family_prayer_requests')
    .update(updateData)
    .eq('id', requestId)
    .eq('family_id', id)
    .eq('church_id', auth.churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
