import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  const [sessionsRes, scansRes, parentReqsRes, volunteersRes, roomsRes] = await Promise.all([
    admin
      .from('cm_volunteer_sessions')
      .select('id, volunteer_id, room_id, issued_at, expires_at, revoked_at')
      .eq('church_id', churchId)
      .order('issued_at', { ascending: false })
      .limit(50),

    admin
      .from('cm_label_scan_log')
      .select('id, scanned_at, result, volunteer_id, volunteer_session_id, checkin_record_id')
      .eq('church_id', churchId)
      .not('volunteer_id', 'is', null)
      .order('scanned_at', { ascending: false })
      .limit(100),

    admin
      .from('cm_parent_requests')
      .select('id, sent_at, delivery_status, source, volunteer_id, room_id, child_name')
      .eq('church_id', churchId)
      .not('volunteer_id', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(100),

    admin
      .from('cm_volunteers')
      .select('id, first_name, last_name')
      .eq('church_id', churchId),

    admin
      .from('cm_checkin_rooms')
      .select('id, name')
      .eq('church_id', churchId),
  ]);

  type Vol = { id: string; first_name: string; last_name: string };
  type Room = { id: string; name: string };

  const volMap = new Map<string, string>((volunteersRes.data ?? []).map((v: Vol) => [v.id, `${v.first_name} ${v.last_name}`]));
  const roomMap = new Map<string, string>((roomsRes.data ?? []).map((r: Room) => [r.id, r.name]));

  // Enrich scans: get child names from checkin records
  const scanRecordIds = (scansRes.data ?? [])
    .map((s: { checkin_record_id?: string | null }) => s.checkin_record_id)
    .filter(Boolean) as string[];

  const childNamesRes = scanRecordIds.length
    ? await admin.from('cm_checkin_records').select('id, child_name, room_id').in('id', scanRecordIds)
    : { data: [] };

  type CRec = { id: string; child_name: string; room_id: string | null };
  const recMap = new Map<string, CRec>((childNamesRes.data ?? []).map((r: CRec) => [r.id, r]));

  // Enrich session room_ids (from volunteer_sessions)
  const sessionIds = (scansRes.data ?? [])
    .map((s: { volunteer_session_id?: string | null }) => s.volunteer_session_id)
    .filter(Boolean) as string[];

  const sessionRoomsRes = sessionIds.length
    ? await admin.from('cm_volunteer_sessions').select('id, room_id').in('id', sessionIds)
    : { data: [] };

  type SessRoom = { id: string; room_id: string };
  const sessionRoomMap = new Map<string, string>((sessionRoomsRes.data ?? []).map((s: SessRoom) => [s.id, s.room_id]));

  const now = new Date();

  const sessions = (sessionsRes.data ?? []).map((s: {
    id: string; volunteer_id: string; room_id: string;
    issued_at: string; expires_at: string; revoked_at: string | null;
  }) => ({
    id: s.id,
    volunteerName: volMap.get(s.volunteer_id) ?? 'Unknown',
    roomName: roomMap.get(s.room_id) ?? 'Unknown',
    issuedAt: s.issued_at,
    expiresAt: s.expires_at,
    status: s.revoked_at ? 'revoked' : new Date(s.expires_at) < now ? 'expired' : 'active',
  }));

  const scans = (scansRes.data ?? []).map((s: {
    id: string; scanned_at: string; result: string;
    volunteer_id: string; volunteer_session_id: string | null; checkin_record_id: string | null;
  }) => {
    const rec = s.checkin_record_id ? recMap.get(s.checkin_record_id) : null;
    const sessionRoomId = s.volunteer_session_id ? sessionRoomMap.get(s.volunteer_session_id) : null;
    const roomId = rec?.room_id ?? sessionRoomId;
    return {
      id: s.id,
      scannedAt: s.scanned_at,
      result: s.result,
      volunteerName: volMap.get(s.volunteer_id) ?? 'Unknown',
      childName: rec?.child_name ?? null,
      roomName: roomId ? roomMap.get(roomId) ?? null : null,
    };
  });

  const parentRequests = (parentReqsRes.data ?? []).map((r: {
    id: string; sent_at: string; delivery_status: string;
    volunteer_id: string; room_id: string | null; child_name: string;
  }) => ({
    id: r.id,
    sentAt: r.sent_at,
    deliveryStatus: r.delivery_status,
    volunteerName: volMap.get(r.volunteer_id) ?? 'Unknown',
    roomName: r.room_id ? roomMap.get(r.room_id) ?? null : null,
    childName: r.child_name,
  }));

  return Response.json({ sessions, scans, parentRequests });
}
