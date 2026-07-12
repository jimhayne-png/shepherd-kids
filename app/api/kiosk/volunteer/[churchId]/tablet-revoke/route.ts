import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { hashSessionToken } from '@/lib/crypto/token';

// Revokes the tablet session and all its linked volunteer sessions, then clears
// the vk_tablet cookie. Called when a volunteer selects "Change Classroom".
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const rawToken = req.cookies.get('vk_tablet')?.value ?? null;
  const now = new Date().toISOString();
  const admin = adminClient();

  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);

    const { data: tablet } = await admin
      .from('cm_tablet_sessions')
      .select('id')
      .eq('token_hash', tokenHash)
      .eq('church_id', churchId)
      .is('revoked_at', null)
      .maybeSingle();

    type TabletRow = { id: string };
    const t = tablet as unknown as TabletRow | null;

    if (t) {
      await admin
        .from('cm_volunteer_sessions')
        .update({ revoked_at: now })
        .eq('tablet_session_id', t.id)
        .is('revoked_at', null);

      await admin
        .from('cm_tablet_sessions')
        .update({ revoked_at: now })
        .eq('id', t.id);
    }
  }

  const headers = new Headers();
  headers.append('Set-Cookie', 'vk_tablet=; Path=/api/kiosk; HttpOnly; SameSite=Strict; Max-Age=0');
  return Response.json({ success: true }, { headers });
}
