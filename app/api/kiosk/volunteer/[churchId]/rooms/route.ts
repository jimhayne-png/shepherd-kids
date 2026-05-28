import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const admin = adminClient();

  const { data: rooms, error } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, min_age, max_age, capacity')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .order('name');

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ rooms: rooms ?? [] });
}
