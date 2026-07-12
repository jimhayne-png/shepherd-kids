import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { hashSessionToken } from '@/lib/crypto/token';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const rawToken = req.cookies.get('vk_session')?.value;

  if (!rawToken) {
    return Response.json({ valid: false, error: 'No session.' });
  }

  const tokenHash = hashSessionToken(rawToken);
  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_volunteer_sessions')
    .select('id, volunteer_id, room_id, expires_at, revoked_at')
    .eq('session_token_hash', tokenHash)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
    return Response.json({ valid: false, error: 'Session expired or invalid.' });
  }

  const [{ data: volunteer }, { data: room }] = await Promise.all([
    admin
      .from('cm_volunteers')
      .select('first_name, last_name, approved, background_check_status, is_active')
      .eq('id', session.volunteer_id)
      .maybeSingle(),
    admin
      .from('cm_checkin_rooms')
      .select('name')
      .eq('id', session.room_id)
      .maybeSingle(),
  ]);

  if (!volunteer?.approved || volunteer.background_check_status !== 'cleared' || !volunteer.is_active) {
    return Response.json({ valid: false, error: 'Volunteer is no longer approved.' });
  }

  return Response.json({
    valid: true,
    volunteerName: `${volunteer.first_name} ${volunteer.last_name}`,
    roomId: session.room_id,
    roomName: (room as { name: string } | null)?.name ?? null,
    expiresAt: session.expires_at,
  });
}
