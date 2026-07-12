import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';
import { hashSessionToken } from '@/lib/crypto/token';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  await params;
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/(?:^|;\s*)vk_session=([^;]+)/);
  const rawToken = match?.[1];

  if (!rawToken) {
    return Response.json({ error: 'No active session.' }, { status: 401 });
  }

  const tokenHash = hashSessionToken(rawToken);

  const { error } = await adminClient()
    .from('cm_volunteer_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('session_token_hash', tokenHash)
    .is('revoked_at', null);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'vk_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
    },
  });
}
