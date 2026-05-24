import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionToken: string }> },
) {
  const { sessionToken } = await params;
  const body = await req.json();
  const { parentName, parentPhone, childName, childAge, roomId } = body as {
    parentName: string;
    parentPhone: string;
    childName: string;
    childAge?: number;
    roomId?: string;
  };

  if (!parentName || !parentPhone || !childName) {
    return Response.json(
      { error: 'parentName, parentPhone, and childName are required' },
      { status: 400 },
    );
  }

  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, church_id, status')
    .eq('id', sessionToken)
    .maybeSingle();

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'open') return Response.json({ error: 'Session is closed' }, { status: 400 });

  const normalizedPhone = parentPhone.replace(/\D/g, '');
  const securityCode = String(Math.floor(100000 + Math.random() * 900000));

  // Derive room from age if not explicitly selected
  let resolvedRoomId = roomId ?? null;
  if (!resolvedRoomId && childAge != null) {
    const { data: rooms } = await admin
      .from('cm_checkin_rooms')
      .select('id, min_age, max_age')
      .eq('church_id', session.church_id)
      .eq('is_active', true)
      .order('min_age');

    for (const r of rooms ?? []) {
      const ageOk =
        (r.min_age == null || childAge >= r.min_age) &&
        (r.max_age == null || childAge <= r.max_age);
      if (ageOk) { resolvedRoomId = r.id; break; }
    }
  }

  const { data: record, error } = await admin
    .from('cm_checkin_records')
    .insert({
      session_id: session.id,
      church_id: session.church_id,
      child_name: childName,
      parent_name: parentName,
      parent_phone: normalizedPhone,
      room_id: resolvedRoomId,
      security_code: securityCode,
      is_new_visitor: false,
      allergies: [],
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ securityCode, recordId: record.id });
}
