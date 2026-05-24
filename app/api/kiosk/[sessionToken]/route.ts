import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionToken: string }> },
) {
  const { sessionToken } = await params;
  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, church_id, service_name, date, status')
    .eq('id', sessionToken)
    .maybeSingle();

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'open') return Response.json({ error: 'Session is closed' }, { status: 400 });

  const { data: rooms } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, min_age, max_age')
    .eq('church_id', session.church_id)
    .eq('is_active', true)
    .order('name');

  return Response.json({
    session: { id: session.id, service_name: session.service_name, date: session.date },
    rooms: rooms ?? [],
  });
}
