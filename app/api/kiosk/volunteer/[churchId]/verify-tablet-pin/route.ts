import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { verifyPin } from '@/lib/crypto/pin';

// Classroom Tablet PIN-only authentication.
// Verifies the volunteer's Personal Volunteer PIN without requiring a phone number.
// No session is created here — this step only returns the volunteer's identity and
// their assigned classrooms so the tablet can present the classroom selection screen.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const body = await req.json();
  const { pin } = body;

  if (!pin) {
    return Response.json({ error: 'PIN is required.' }, { status: 400 });
  }

  const admin = adminClient();

  // Narrow the search to volunteers who have at least one active classroom assignment.
  // This avoids running scrypt against the full volunteer table.
  const { data: assignments } = await admin
    .from('cm_volunteer_classroom_assignments')
    .select('volunteer_id')
    .eq('church_id', churchId)
    .eq('active', true);

  type AssRow = { volunteer_id: string };
  const assignedIds = [...new Set(((assignments ?? []) as unknown as AssRow[]).map(a => a.volunteer_id))];

  if (assignedIds.length === 0) {
    return Response.json({ error: 'No volunteers have active classroom assignments.' }, { status: 401 });
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
    return Response.json({ error: 'Incorrect PIN, or your account is not approved.' }, { status: 401 });
  }

  // Fetch this volunteer's assigned rooms that have a QR token configured.
  const { data: volAssignments } = await admin
    .from('cm_volunteer_classroom_assignments')
    .select('room_id')
    .eq('volunteer_id', matched.id)
    .eq('church_id', churchId)
    .eq('active', true);

  const roomIds = ((volAssignments ?? []) as unknown as { room_id: string }[]).map(a => a.room_id);

  if (roomIds.length === 0) {
    return Response.json({ error: 'You have no active classroom assignments.' }, { status: 403 });
  }

  const { data: rooms } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, classroom_qr_token')
    .in('id', roomIds)
    .eq('is_active', true)
    .not('classroom_qr_token', 'is', null)
    .order('name');

  type RoomRow = { id: string; name: string; classroom_qr_token: string };
  const assignedRooms = ((rooms ?? []) as unknown as RoomRow[]).map(r => ({
    id: r.id,
    name: r.name,
    qrToken: r.classroom_qr_token,
  }));

  if (assignedRooms.length === 0) {
    return Response.json(
      { error: 'Your assigned classrooms are not yet configured for tablet access. Contact your administrator.' },
      { status: 403 }
    );
  }

  return Response.json({
    volunteerName: `${matched.first_name} ${matched.last_name}`,
    volunteerId: matched.id,
    assignedRooms,
  });
}
