import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { verifyPin } from '@/lib/crypto/pin';
import { generateSessionToken, hashSessionToken } from '@/lib/crypto/token';

// Classroom Tablet sign-in. Verifies PIN + classroom assignment, then:
// - First volunteer on this device: creates a cm_tablet_sessions row and sets the
//   vk_tablet HttpOnly cookie that identifies this specific browser as the tablet.
// - Additional volunteers: reads the existing vk_tablet cookie, validates the tablet
//   session, and creates a new volunteer session linked to it.
// Volunteer sessions carry tablet_session_id so all subsequent operations are device-scoped.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const body = await req.json();
  const { pin, roomToken } = body;

  if (!pin || !roomToken) {
    return Response.json({ error: 'PIN and room token are required.' }, { status: 400 });
  }

  const admin = adminClient();

  const { data: room } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, church_id')
    .eq('classroom_qr_token', roomToken)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!room) {
    return Response.json({ error: 'Invalid classroom.' }, { status: 404 });
  }

  const { data: assignments } = await admin
    .from('cm_volunteer_classroom_assignments')
    .select('volunteer_id')
    .eq('room_id', room.id)
    .eq('church_id', churchId)
    .eq('active', true);

  type AssRow = { volunteer_id: string };
  const assignedIds = ((assignments ?? []) as unknown as AssRow[]).map(a => a.volunteer_id);

  if (assignedIds.length === 0) {
    return Response.json({ error: 'No approved volunteers are assigned to this classroom.' }, { status: 401 });
  }

  const { data: candidates } = await admin
    .from('cm_volunteers')
    .select('id, first_name, last_name, pin_hash')
    .in('id', assignedIds)
    .eq('church_id', churchId)
    .eq('approved', true)
    .eq('background_check_status', 'cleared')
    .eq('is_active', true)
    .not('pin_hash', 'is', null);

  type Candidate = { id: string; first_name: string; last_name: string; pin_hash: string | null };

  let matched: Candidate | null = null;
  for (const v of (candidates ?? []) as unknown as Candidate[]) {
    const pinOk = await verifyPin(String(pin).trim(), v.pin_hash!);
    if (pinOk) { matched = v; break; }
  }

  if (!matched) {
    return Response.json({ error: 'Incorrect PIN, or you are not approved to serve in this classroom.' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const responseHeaders = new Headers();

  // Resolve or create the device-specific tablet session
  let tabletSessionId: string | null = null;
  const rawTabletToken = req.cookies.get('vk_tablet')?.value ?? null;

  if (rawTabletToken) {
    const existingHash = hashSessionToken(rawTabletToken);
    const { data: existing } = await admin
      .from('cm_tablet_sessions')
      .select('id, room_id, expires_at, revoked_at')
      .eq('token_hash', existingHash)
      .eq('church_id', churchId)
      .maybeSingle();

    type TabletRow = { id: string; room_id: string; expires_at: string; revoked_at: string | null };
    const t = existing as unknown as TabletRow | null;

    if (t && !t.revoked_at && new Date(t.expires_at) > new Date() && t.room_id === room.id) {
      tabletSessionId = t.id;
      await admin.from('cm_tablet_sessions').update({ last_seen_at: now }).eq('id', t.id);
    }
  }

  if (!tabletSessionId) {
    const rawNewToken = generateSessionToken();
    const newTokenHash = hashSessionToken(rawNewToken);

    const { data: newTablet } = await admin
      .from('cm_tablet_sessions')
      .insert({
        church_id: churchId,
        room_id: room.id,
        token_hash: newTokenHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    type TabletInsert = { id: string };
    if (!newTablet) {
      return Response.json({ error: 'Failed to create tablet session.' }, { status: 500 });
    }
    tabletSessionId = (newTablet as unknown as TabletInsert).id;
    responseHeaders.append(
      'Set-Cookie',
      `vk_tablet=${rawNewToken}; Path=/api/kiosk; HttpOnly; SameSite=Strict; Max-Age=10800`,
    );
  }

  const rawVolToken = generateSessionToken();
  const volTokenHash = hashSessionToken(rawVolToken);

  const { data: session, error: sessionError } = await admin
    .from('cm_volunteer_sessions')
    .insert({
      church_id: churchId,
      volunteer_id: matched.id,
      room_id: room.id,
      session_token_hash: volTokenHash,
      expires_at: expiresAt,
      tablet_session_id: tabletSessionId,
    })
    .select('id, issued_at, expires_at')
    .single();

  if (sessionError || !session) {
    return Response.json({ error: 'Failed to create session.' }, { status: 500 });
  }

  type SessionRow = { id: string; issued_at: string; expires_at: string };
  const s = session as unknown as SessionRow;

  return Response.json({
    sessionId: s.id,
    volunteerId: matched.id,
    volunteerName: `${matched.first_name} ${matched.last_name}`,
    issuedAt: s.issued_at,
    expiresAt: s.expires_at,
  }, { headers: responseHeaders });
}
