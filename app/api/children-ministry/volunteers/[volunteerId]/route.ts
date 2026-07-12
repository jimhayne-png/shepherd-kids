import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { hashPin } from '@/lib/crypto/pin';

const VOLUNTEER_FIELDS = [
  'id', 'church_id', 'member_id', 'first_name', 'last_name',
  'email', 'phone', 'roles', 'is_active', 'background_check_status',
  'background_check_date', 'notes', 'reliability_score', 'created_at',
  'updated_at', 'approved', 'approved_at', 'approved_by',
].join(', ');

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) {
  const { volunteerId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.first_name   !== undefined) updates.first_name   = body.first_name.trim();
  if (body.last_name    !== undefined) updates.last_name    = body.last_name.trim();
  if (body.email        !== undefined) updates.email        = body.email?.trim() || null;
  if (body.phone        !== undefined) updates.phone        = body.phone?.trim() || null;
  if (body.background_check_status !== undefined) updates.background_check_status = body.background_check_status;
  if (body.background_check_date   !== undefined) updates.background_check_date   = body.background_check_date || null;
  if (body.notes        !== undefined) updates.notes        = body.notes?.trim() || null;
  if (body.is_active    !== undefined) updates.is_active    = body.is_active;

  if (body.approved !== undefined) {
    updates.approved    = !!body.approved;
    updates.approved_at = body.approved ? new Date().toISOString() : null;
    updates.approved_by = body.approved ? userId : null;
  }

  if (body.pin !== undefined) {
    updates.pin_hash = body.pin ? await hashPin(String(body.pin).trim()) : null;
  }

  updates.updated_at = new Date().toISOString();

  const { data: row, error } = await adminClient()
    .from('cm_volunteers')
    .update(updates)
    .eq('id', volunteerId)
    .eq('church_id', churchId)
    .select(`${VOLUNTEER_FIELDS}, pin_hash`)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Update classroom assignments when classroom_ids is provided
  if (Array.isArray(body.classroom_ids)) {
    const newIds = (body.classroom_ids as unknown[]).filter((id): id is string => typeof id === 'string');
    const adm = adminClient();

    await adm.from('cm_volunteer_classroom_assignments')
      .update({ active: false })
      .eq('volunteer_id', volunteerId)
      .eq('church_id', churchId)
      .eq('active', true);

    if (newIds.length) {
      await adm.from('cm_volunteer_classroom_assignments').insert(
        newIds.map(roomId => ({
          church_id: churchId,
          volunteer_id: volunteerId,
          room_id: roomId,
          active: true,
        }))
      );
    }
  }

  const { pin_hash, ...volunteer } = row as unknown as { pin_hash?: string | null; [k: string]: unknown };
  return Response.json({ volunteer: { ...volunteer, has_pin: !!pin_hash } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) {
  const { volunteerId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const { error } = await adminClient()
    .from('cm_volunteers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', volunteerId)
    .eq('church_id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
