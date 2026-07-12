import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { hashSessionToken } from '@/lib/crypto/token';

// Validates the vk_tablet HttpOnly cookie and returns this device's current state.
// Called on mount by VolunteerPinGate to restore unlocked state after page refresh.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const rawToken = req.cookies.get('vk_tablet')?.value ?? null;

  if (!rawToken) {
    return Response.json({ unlocked: false });
  }

  const tokenHash = hashSessionToken(rawToken);
  const admin = adminClient();

  const { data: tablet } = await admin
    .from('cm_tablet_sessions')
    .select('id, room_id, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .eq('church_id', churchId)
    .maybeSingle();

  type TabletRow = { id: string; room_id: string; expires_at: string; revoked_at: string | null };
  const t = tablet as unknown as TabletRow | null;

  if (!t || t.revoked_at || new Date(t.expires_at) <= new Date()) {
    const headers = new Headers();
    headers.append('Set-Cookie', 'vk_tablet=; Path=/api/kiosk; HttpOnly; SameSite=Strict; Max-Age=0');
    return Response.json({ unlocked: false }, { headers });
  }

  await admin
    .from('cm_tablet_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', t.id);

  const { data: room } = await admin
    .from('cm_checkin_rooms')
    .select('name, classroom_qr_token')
    .eq('id', t.room_id)
    .maybeSingle();

  type RoomRow = { name: string; classroom_qr_token: string };
  const r = room as unknown as RoomRow | null;

  const now = new Date().toISOString();

  const { data: sessions } = await admin
    .from('cm_volunteer_sessions')
    .select('id, volunteer_id, issued_at, expires_at')
    .eq('tablet_session_id', t.id)
    .eq('church_id', churchId)
    .is('revoked_at', null)
    .gt('expires_at', now)
    .order('issued_at', { ascending: true });

  type SessionRow = { id: string; volunteer_id: string; issued_at: string; expires_at: string };
  const typedSessions = (sessions ?? []) as unknown as SessionRow[];

  let volMap = new Map<string, string>();
  if (typedSessions.length > 0) {
    const volunteerIds = [...new Set(typedSessions.map(s => s.volunteer_id))];
    const { data: volunteers } = await admin
      .from('cm_volunteers')
      .select('id, first_name, last_name')
      .in('id', volunteerIds);
    type VolRow = { id: string; first_name: string; last_name: string };
    volMap = new Map(((volunteers ?? []) as unknown as VolRow[]).map(v => [v.id, `${v.first_name} ${v.last_name}`]));
  }

  const volunteerList = typedSessions.map(s => ({
    sessionId: s.id,
    volunteerName: volMap.get(s.volunteer_id) ?? 'Unknown',
    issuedAt: s.issued_at,
    expiresAt: s.expires_at,
  }));

  return Response.json({
    unlocked: true,
    roomId: t.room_id,
    roomName: r?.name ?? 'Unknown Room',
    roomQrToken: r?.classroom_qr_token ?? '',
    volunteers: volunteerList,
  });
}
