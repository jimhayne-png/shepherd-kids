import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { verifyPin } from '@/lib/crypto/pin';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const body = await req.json();
  const { phone, pin } = body;

  if (!phone || !pin) {
    return Response.json({ error: 'Phone and PIN are required.' }, { status: 400 });
  }

  const normalizedInput = normalizePhone(String(phone));
  if (normalizedInput.length < 7) {
    return Response.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const admin = adminClient();

  const { data: candidates } = await admin
    .from('cm_volunteers')
    .select('id, first_name, last_name, phone, pin_hash, approved, background_check_status, is_active')
    .eq('church_id', churchId)
    .eq('approved', true)
    .eq('background_check_status', 'cleared')
    .eq('is_active', true)
    .not('pin_hash', 'is', null);

  type Candidate = {
    id: string; first_name: string; last_name: string;
    phone: string | null; pin_hash: string | null;
    approved: boolean; background_check_status: string; is_active: boolean;
  };

  let matched: Candidate | null = null;
  for (const v of (candidates ?? []) as unknown as Candidate[]) {
    if (normalizePhone(v.phone ?? '') !== normalizedInput) continue;
    const pinOk = await verifyPin(String(pin).trim(), v.pin_hash!);
    if (pinOk) { matched = v; break; }
  }

  if (!matched) {
    return Response.json({ error: 'Incorrect phone or PIN, or your account is not approved.' }, { status: 401 });
  }

  // Get volunteer's assigned classroom IDs
  const { data: assignments } = await admin
    .from('cm_volunteer_classroom_assignments')
    .select('room_id')
    .eq('volunteer_id', matched.id)
    .eq('church_id', churchId)
    .eq('active', true);

  type AssignmentRow = { room_id: string };
  const roomIds = ((assignments ?? []) as unknown as AssignmentRow[]).map(a => a.room_id);

  if (roomIds.length === 0) {
    return Response.json({ error: 'You have no assigned classrooms. Contact your administrator.' }, { status: 403 });
  }

  // Fetch room details including QR token (needed to create session via verify-volunteer)
  const { data: rooms } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, classroom_qr_token')
    .in('id', roomIds)
    .eq('is_active', true)
    .order('name');

  type RoomRow = { id: string; name: string; classroom_qr_token: string | null };
  const assignedRooms = ((rooms ?? []) as unknown as RoomRow[]).map(r => ({
    id: r.id,
    name: r.name,
    qrToken: r.classroom_qr_token,
  }));

  return Response.json({
    volunteerName: `${matched.first_name} ${matched.last_name}`,
    assignedRooms,
  });
}
