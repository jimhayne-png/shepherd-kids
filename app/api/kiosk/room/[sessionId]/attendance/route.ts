import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const admin = adminClient();

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .select('id, child_name, parent_name, parent_phone, room_id, security_code, is_new_visitor, allergies, allergy_other, authorized_pickups, checked_in_at, checked_out_at, checked_out_by')
    .eq('session_id', sessionId)
    .order('child_name', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const roomIds = [...new Set((records ?? []).map(r => r.room_id).filter(Boolean) as string[])];

  const { data: rooms } = roomIds.length
    ? await admin.from('cm_checkin_rooms').select('id, name').in('id', roomIds)
    : { data: [] };

  const roomMap: Record<string, string> = {};
  for (const r of rooms ?? []) roomMap[r.id] = r.name;

  const enriched = (records ?? []).map(r => ({
    ...r,
    room_name: r.room_id ? (roomMap[r.room_id] ?? null) : null,
  }));

  enriched.sort((a, b) => {
    const ra = a.room_name ?? '';
    const rb = b.room_name ?? '';
    if (ra !== rb) return ra.localeCompare(rb);
    return a.child_name.localeCompare(b.child_name);
  });

  return Response.json({ records: enriched });
}
