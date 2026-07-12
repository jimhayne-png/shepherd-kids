import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { verifyPin } from '@/lib/crypto/pin';
import { generateSessionToken, hashSessionToken } from '@/lib/crypto/token';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `vk_session=${token}`,
    'HttpOnly',
    isProd ? 'Secure' : '',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=10800',
  ].filter(Boolean);
  return parts.join('; ');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const body = await req.json();
  const { phone, pin, roomToken } = body;

  if (!phone || !pin || !roomToken) {
    return Response.json({ error: 'Phone, PIN, and room token are required.' }, { status: 400 });
  }

  const admin = adminClient();

  const { data: room } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, church_id')
    .eq('classroom_qr_token', roomToken)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!room) {
    return Response.json({ error: 'Invalid classroom token.' }, { status: 404 });
  }

  // Load vetted volunteers with a PIN hash set
  const { data: candidates } = await admin
    .from('cm_volunteers')
    .select('id, first_name, last_name, phone, pin_hash, approved, background_check_status, is_active')
    .eq('church_id', churchId)
    .eq('approved', true)
    .eq('background_check_status', 'cleared')
    .eq('is_active', true)
    .not('pin_hash', 'is', null);

  const normalizedInput = normalizePhone(String(phone));
  if (normalizedInput.length < 7) {
    return Response.json({ error: 'Invalid credentials or you are not yet approved.' }, { status: 401 });
  }

  let matched: (typeof candidates extends (infer T)[] | null ? T : never) | null = null;
  for (const v of candidates ?? []) {
    const phoneMatch = normalizePhone(v.phone ?? '') === normalizedInput;
    if (!phoneMatch) continue;
    const pinOk = await verifyPin(String(pin).trim(), v.pin_hash!);
    if (pinOk) { matched = v; break; }
  }

  if (!matched) {
    return Response.json({ error: 'Invalid credentials or you are not yet approved.' }, { status: 401 });
  }

  // Generate raw token in the application; store only the SHA-256 hash in the database.
  // The raw token exists exclusively in the HttpOnly vk_session cookie — never in the DB or logs.
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);

  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const { data: session, error: sessionError } = await admin
    .from('cm_volunteer_sessions')
    .insert({ church_id: churchId, volunteer_id: matched.id, room_id: room.id, session_token_hash: tokenHash, expires_at: expiresAt })
    .select('expires_at')
    .single();

  if (sessionError || !session) {
    return Response.json({ error: 'Failed to create session.' }, { status: 500 });
  }

  return new Response(
    JSON.stringify({
      volunteerName: `${matched.first_name} ${matched.last_name}`,
      roomId: room.id,
      roomName: room.name,
      expiresAt: session.expires_at,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildSessionCookie(rawToken),
      },
    },
  );
}
