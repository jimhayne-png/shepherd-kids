import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

type SessionRow = { id: string; service_name: string; date: string; scheduled_time: string | null; session_group: string | null };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const admin = adminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: sessionRows }, { data: roomRows }] = await Promise.all([
    admin
      .from('cm_checkin_sessions')
      .select('id, service_name, date, scheduled_time, session_group')
      .eq('church_id', churchId)
      .eq('date', today)
      .eq('status', 'open')
      .order('created_at', { ascending: true }),
    admin
      .from('cm_checkin_rooms')
      .select('id, name, min_age, max_age')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('name'),
  ]);

  const sessions: SessionRow[] = (sessionRows ?? []) as SessionRow[];

  const groupMap = new Map<string, SessionRow[]>();
  const ungrouped: SessionRow[] = [];

  for (const s of sessions) {
    if (s.session_group) {
      if (!groupMap.has(s.session_group)) groupMap.set(s.session_group, []);
      groupMap.get(s.session_group)!.push(s);
    } else {
      ungrouped.push(s);
    }
  }

  const groups = Array.from(groupMap.entries()).map(([name, sess]) => ({ name, sessions: sess }));

  return Response.json({ groups, ungrouped, rooms: roomRows ?? [] });
}
