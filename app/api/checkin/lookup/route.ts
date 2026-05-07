import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: NextRequest) {
  const { phone, sessionId } = await request.json();
  if (!phone || !sessionId) return Response.json({ error: 'phone and sessionId required' }, { status: 400 });

  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('church_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  const normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.length < 7) return Response.json({ found: false, children: [] });

  const { data: records } = await admin
    .from('cm_checkin_records')
    .select('child_name, room_id, allergies, allergy_other, parent_name')
    .eq('church_id', session.church_id)
    .ilike('parent_phone', `%${normalizedPhone}%`)
    .order('checked_in_at', { ascending: false })
    .limit(200);

  if (!records || records.length === 0) return Response.json({ found: false, children: [] });

  // Deduplicate by child_name, keeping most recent record
  const childMap = new Map<string, typeof records[0]>();
  for (const r of records) {
    if (!childMap.has(r.child_name)) childMap.set(r.child_name, r);
  }

  const roomIds = [...new Set([...childMap.values()].map(c => c.room_id).filter(Boolean))];
  const roomMap: Record<string, string> = {};
  if (roomIds.length > 0) {
    const { data: rooms } = await admin.from('cm_checkin_rooms').select('id, name').in('id', roomIds);
    for (const room of rooms ?? []) roomMap[room.id] = room.name;
  }

  const children = [...childMap.values()].map(c => ({
    childName: c.child_name,
    roomId: c.room_id ?? null,
    roomName: c.room_id ? (roomMap[c.room_id] ?? 'Unknown Room') : null,
    allergies: c.allergies ?? [],
    allergyOther: c.allergy_other ?? null,
    parentName: c.parent_name,
  }));

  return Response.json({ found: true, children });
}
