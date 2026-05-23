import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ volunteerId: string; availabilityId: string }> }) {
  const { availabilityId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;
  const { error } = await adminClient().from('cm_volunteer_availability').delete().eq('id', availabilityId).eq('church_id', churchId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
