import { type NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ churchId: auth.churchId });
}
