import { type NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api-auth';
import { getSubscriptionInfo } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const info = await getSubscriptionInfo(auth.churchId);
  return Response.json(info);
}
