import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const roomId = req.nextUrl.searchParams.get('roomId');

  if (!roomId) return Response.json({ error: 'roomId required' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const admin = adminClient();

  const { data: sessions } = await admin
    .from('cm_checkin_sessions')
    .select('id, service_name')
    .eq('church_id', churchId)
    .eq('date', today)
    .eq('status', 'open');

  if (!sessions?.length) return Response.json({ records: [] });

  const sessionIds = sessions.map(s => s.id);
  const sessionMap: Record<string, string> = {};
  for (const s of sessions) sessionMap[s.id] = s.service_name;

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .select('id, session_id, child_name, parent_name, parent_phone, room_id, security_code, is_new_visitor, allergies, allergy_other, authorized_pickups, checked_in_at, checked_out_at, checked_out_by')
    .in('session_id', sessionIds)
    .eq('room_id', roomId)
    .order('child_name', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const enriched = (records ?? []).map(r => ({
    ...r,
    service_name: sessionMap[r.session_id] ?? null,
  }));

  return Response.json({ records: enriched });
}
