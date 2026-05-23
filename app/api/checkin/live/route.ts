import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, service_name, date, scheduled_time')
    .eq('church_id', auth.churchId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return Response.json({ session: null, rooms: [], totalCheckedIn: 0 });

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .select('*')
    .eq('session_id', session.id)
    .is('checked_out_at', null)
    .order('checked_in_at');

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const allRecords = records ?? [];

  const roomIds = [...new Set(allRecords.map((r: any) => r.room_id).filter(Boolean) as string[])];
  const roomNameMap: Record<string, string> = {};
  if (roomIds.length) {
    const { data: rooms } = await admin.from('cm_checkin_rooms').select('id, name').in('id', roomIds);
    for (const r of rooms ?? []) roomNameMap[r.id] = r.name;
  }

  const roomGroups: Record<string, { room_id: string; room_name: string; children: any[] }> = {};
  for (const r of allRecords) {
    const key = r.room_id ?? 'unassigned';
    if (!roomGroups[key]) {
      roomGroups[key] = {
        room_id: key,
        room_name: key === 'unassigned' ? 'Unassigned' : (roomNameMap[key] ?? key),
        children: [],
      };
    }
    roomGroups[key].children.push({
      id: r.id,
      child_name: r.child_name,
      parent_name: r.parent_name,
      is_new_visitor: r.is_new_visitor,
      allergies: r.allergies ?? [],
      allergy_other: r.allergy_other ?? null,
      checked_in_at: r.checked_in_at,
    });
  }

  const rooms = Object.values(roomGroups).sort((a, b) => b.children.length - a.children.length);

  return Response.json({ session, totalCheckedIn: allRecords.length, rooms });
}
