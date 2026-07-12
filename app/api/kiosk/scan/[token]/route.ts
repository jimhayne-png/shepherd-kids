import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { hashSessionToken } from '@/lib/crypto/token';

// Only these fields may be returned from a protected scan response.
const PERMITTED_CHILD_FIELDS = [
  'id', 'church_id', 'session_id', 'child_name', 'room_id',
  'security_code', 'allergies', 'allergy_other', 'medical_notes',
  'authorized_pickups', 'checked_in_at', 'is_new_visitor',
] as const;

async function resolveSession(req: NextRequest, admin: ReturnType<typeof adminClient>) {
  const rawToken = req.cookies.get('vk_session')?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);

  const { data: session } = await admin
    .from('cm_volunteer_sessions')
    .select('id, volunteer_id, room_id, church_id, expires_at, revoked_at')
    .eq('session_token_hash', tokenHash)
    .maybeSingle();

  if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) return null;
  return session;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = adminClient();

  // Resolve label record (unauthenticated — token is opaque)
  // Cast through unknown: PERMITTED_CHILD_FIELDS.join() is a runtime string; Supabase TS
  // can't infer column types from it and falls back to GenericStringError.
  type RecordRow = {
    id: string; church_id: string; session_id: string; child_name: string;
    room_id: string | null; security_code: string; allergies: string[] | null;
    allergy_other: string | null; medical_notes: string | null;
    authorized_pickups: string | null; checked_in_at: string; is_new_visitor: boolean | null;
  };
  const { data: rawRecord } = await admin
    .from('cm_checkin_records')
    .select(PERMITTED_CHILD_FIELDS.join(', '))
    .eq('qr_token', token)
    .maybeSingle();

  if (!rawRecord) {
    return Response.json({ result: 'not_found' }, { status: 404 });
  }
  const record = rawRecord as unknown as RecordRow;

  // Resolve volunteer session from HttpOnly cookie
  const session = await resolveSession(req, admin);

  const logUnauthorized = async (reason?: string) => {
    await admin.from('cm_label_scan_log').insert({
      church_id: record.church_id,
      qr_token: token,
      checkin_record_id: record.id,
      result: 'unauthorized',
      volunteer_session_id: session?.id ?? null,
      volunteer_id: session?.volunteer_id ?? null,
    });
    console.warn('[kiosk/scan] unauthorized', { reason, token: token.slice(0, 6) });
  };

  if (!session) {
    await logUnauthorized('no valid session');
    return Response.json({ result: 'unauthorized' }, { status: 401 });
  }

  // Multi-tenant: session must belong to same church as label
  if (session.church_id !== record.church_id) {
    await logUnauthorized('church mismatch');
    return Response.json({ result: 'unauthorized' }, { status: 403 });
  }

  // Re-validate volunteer status on every scan (revocation takes immediate effect)
  const { data: volunteer } = await admin
    .from('cm_volunteers')
    .select('first_name, last_name, approved, background_check_status, is_active')
    .eq('id', session.volunteer_id)
    .maybeSingle();

  if (!volunteer?.approved || volunteer.background_check_status !== 'cleared' || !volunteer.is_active) {
    await logUnauthorized('volunteer no longer vetted');
    return Response.json({ result: 'unauthorized' }, { status: 403 });
  }

  // Enforce classroom assignment: volunteer must be assigned to the child's room
  const childRoomId = record.room_id as string | null;
  if (!childRoomId) {
    await logUnauthorized('child has no room assigned');
    return Response.json({ result: 'unauthorized' }, { status: 403 });
  }

  const { data: assignment } = await admin
    .from('cm_volunteer_classroom_assignments')
    .select('id')
    .eq('volunteer_id', session.volunteer_id)
    .eq('room_id', childRoomId)
    .eq('church_id', record.church_id)
    .eq('active', true)
    .maybeSingle();

  if (!assignment) {
    await logUnauthorized('no active classroom assignment for this room');
    return Response.json({ result: 'unauthorized' }, { status: 403 });
  }

  // Check label/session expiry
  const [{ data: checkinSession }, { data: roomRow }] = await Promise.all([
    admin
      .from('cm_checkin_sessions')
      .select('service_name, status, closed_at, label_expiry_minutes')
      .eq('id', record.session_id)
      .maybeSingle(),
    admin
      .from('cm_checkin_rooms')
      .select('name')
      .eq('id', childRoomId)
      .maybeSingle(),
  ]);

  let result: 'valid' | 'expired' = 'valid';
  let expiredReason: string | null = null;

  if (checkinSession?.status === 'closed') {
    const expiryMinutes: number = (checkinSession as { label_expiry_minutes?: number }).label_expiry_minutes ?? 15;
    if (expiryMinutes !== 0) {
      const closedAt = (checkinSession as { closed_at?: string }).closed_at
        ? new Date((checkinSession as { closed_at: string }).closed_at)
        : null;
      if (!closedAt) {
        result = 'expired';
        expiredReason = 'Session has ended';
      } else if (Date.now() - closedAt.getTime() > expiryMinutes * 60_000) {
        result = 'expired';
        expiredReason = `Session ended more than ${expiryMinutes} minutes ago`;
      }
    }
  }

  // Fetch special instructions from visitor child record (no PII beyond care notes)
  let specialInstructions: string | null = null;
  let medicalNotes: string | null = (record.medical_notes as string | null)?.trim() || null;

  const { data: parentRec } = await admin
    .from('cm_checkin_records')
    .select('parent_phone')
    .eq('id', record.id)
    .maybeSingle();

  if (parentRec?.parent_phone) {
    const { data: family } = await admin
      .from('cm_visitor_families')
      .select('id')
      .eq('church_id', record.church_id)
      .eq('parent1_phone', parentRec.parent_phone)
      .maybeSingle();

    if (family) {
      const [fn, ...rest] = (record.child_name as string ?? '').trim().split(/\s+/);
      const { data: vc } = await admin
        .from('cm_visitor_children')
        .select('special_instructions, medical_notes')
        .eq('family_id', (family as { id: string }).id)
        .eq('first_name', fn ?? '')
        .eq('last_name', rest.join(' '))
        .maybeSingle();

      if (vc) {
        const v = vc as { special_instructions?: string | null; medical_notes?: string | null };
        specialInstructions = v.special_instructions?.trim() || null;
        if (!medicalNotes && v.medical_notes?.trim()) medicalNotes = v.medical_notes.trim();
      }
    }
  }

  await admin.from('cm_label_scan_log').insert({
    church_id: record.church_id,
    qr_token: token,
    checkin_record_id: record.id,
    session_id: record.session_id,
    result,
    volunteer_session_id: session.id,
    volunteer_id: session.volunteer_id,
  });

  return Response.json({
    result,
    expiredReason,
    churchId: record.church_id,
    child: {
      name: record.child_name,
      roomName: (roomRow as { name: string } | null)?.name ?? null,
      securityCode: record.security_code,
      isNewVisitor: !!(record as { is_new_visitor?: boolean }).is_new_visitor,
      allergies: record.allergies,
      allergyOther: record.allergy_other,
      medicalNotes,
      specialInstructions,
      authorizedPickups: record.authorized_pickups,
    },
    checkinRecordId: record.id,
    checkedInAt: record.checked_in_at,
  });
}
