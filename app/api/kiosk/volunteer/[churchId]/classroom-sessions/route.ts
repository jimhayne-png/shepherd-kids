import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { hashSessionToken } from '@/lib/crypto/token';

// Returns active volunteer sessions for THIS specific tablet device only.
// Authorization is via the vk_tablet HttpOnly cookie — not the room token.
// This prevents a different browser (even knowing the roomToken) from seeing
// or modifying another device's session state.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const rawToken = req.cookies.get('vk_tablet')?.value ?? null;

  if (!rawToken) {
    return Response.json({ volunteers: [] });
  }

  const tokenHash = hashSessionToken(rawToken);
  const admin = adminClient();

  const { data: tablet } = await admin
    .from('cm_tablet_sessions')
    .select('id, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .eq('church_id', churchId)
    .maybeSingle();

  type TabletRow = { id: string; expires_at: string; revoked_at: string | null };
  const t = tablet as unknown as TabletRow | null;

  if (!t || t.revoked_at || new Date(t.expires_at) <= new Date()) {
    return Response.json({ volunteers: [] });
  }

  const now = new Date().toISOString();

  const { data: sessions, error } = await admin
    .from('cm_volunteer_sessions')
    .select('id, volunteer_id, issued_at, expires_at')
    .eq('tablet_session_id', t.id)
    .eq('church_id', churchId)
    .is('revoked_at', null)
    .gt('expires_at', now)
    .order('issued_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  type SessionRow = { id: string; volunteer_id: string; issued_at: string; expires_at: string };
  const typedSessions = (sessions ?? []) as unknown as SessionRow[];

  if (typedSessions.length === 0) {
    return Response.json({ volunteers: [] });
  }

  const volunteerIds = [...new Set(typedSessions.map(s => s.volunteer_id))];
  const { data: volunteers } = await admin
    .from('cm_volunteers')
    .select('id, first_name, last_name')
    .in('id', volunteerIds);

  type VolRow = { id: string; first_name: string; last_name: string };
  const volMap = new Map(((volunteers ?? []) as unknown as VolRow[]).map(v => [v.id, `${v.first_name} ${v.last_name}`]));

  const result = typedSessions.map(s => ({
    sessionId: s.id,
    volunteerName: volMap.get(s.volunteer_id) ?? 'Unknown',
    issuedAt: s.issued_at,
    expiresAt: s.expires_at,
  }));

  return Response.json({ volunteers: result });
}
