import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await adminClient().from('churches').select('name').eq('id', ctx.churchId).single();
  return Response.json({ churchId: ctx.churchId, churchName: data?.name ?? null });
}
