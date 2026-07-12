import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { hashSessionToken } from '@/lib/crypto/token';

// Revokes a single volunteer session. Requires the vk_tablet cookie to verify
// the session belongs to this device — prevents external callers from revoking
// sessions on a tablet they don't control.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const rawToken = req.cookies.get('vk_tablet')?.value ?? null;

  if (!rawToken) {
    return Response.json({ error: 'Tablet session not found.' }, { status: 401 });
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
    return Response.json({ error: 'Tablet session invalid or expired.' }, { status: 401 });
  }

  const { sessionId } = await req.json();

  if (!sessionId) {
    return Response.json({ error: 'sessionId required' }, { status: 400 });
  }

  const { error } = await admin
    .from('cm_volunteer_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('tablet_session_id', t.id)
    .eq('church_id', churchId)
    .is('revoked_at', null);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
