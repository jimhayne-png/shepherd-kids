import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = adminClient();

  // Resolve the public token → room (never exposes room.id to the client)
  const { data: room } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, church_id')
    .eq('classroom_qr_token', token)
    .maybeSingle();

  if (!room) return Response.json({ error: 'Room not found' }, { status: 404 });

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, service_name, date, status')
    .eq('church_id', room.church_id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return Response.json({
      records: [],
      room: { name: room.name },
      session: null,
      counts: { checkedIn: 0, checkedOut: 0 },
    });
  }

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .select('*')
    .eq('session_id', session.id)
    .eq('room_id', room.id)
    .order('checked_in_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const all = records ?? [];
  const checkedIn = all.filter(r => !r.checked_out_at).length;
  const checkedOut = all.filter(r => r.checked_out_at).length;

  return Response.json({
    records: all,
    room: { name: room.name },
    session: { id: session.id, service_name: session.service_name, date: session.date },
    counts: { checkedIn, checkedOut },
  });
}
