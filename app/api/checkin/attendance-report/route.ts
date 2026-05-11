import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data } = await admin.from('church_users').select('church_id').eq('user_id', user.id).maybeSingle();
  if (!data?.church_id) return null;
  return { userId: user.id, churchId: data.church_id as string };
}

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  // No sessionId → return sessions list for the dropdown
  if (!sessionId) {
    const { data, error } = await admin
      .from('cm_checkin_sessions')
      .select('id, service_name, date, scheduled_time, status')
      .eq('church_id', auth.churchId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ sessions: data ?? [] });
  }

  // Full report for the selected session
  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, service_name, date, scheduled_time, status')
    .eq('id', sessionId)
    .eq('church_id', auth.churchId)
    .maybeSingle();
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('church_id', auth.churchId)
    .order('checked_in_at');
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const allRecords = records ?? [];

  // Room names
  const roomIds = [...new Set(allRecords.map((r: any) => r.room_id).filter(Boolean) as string[])];
  const roomNameMap: Record<string, string> = {};
  if (roomIds.length) {
    const { data: rooms } = await admin.from('cm_checkin_rooms').select('id, name').in('id', roomIds);
    for (const r of rooms ?? []) roomNameMap[r.id] = r.name;
  }

  // Visit counts per parent_phone (distinct sessions across all time)
  const phones = [...new Set(allRecords.map((r: any) => r.parent_phone as string))];
  const visitCounts: Record<string, number> = {};
  if (phones.length) {
    const { data: allVisits } = await admin
      .from('cm_checkin_records')
      .select('parent_phone, session_id')
      .eq('church_id', auth.churchId)
      .in('parent_phone', phones);
    const visitMap = new Map<string, Set<string>>();
    for (const v of allVisits ?? []) {
      if (!visitMap.has(v.parent_phone)) visitMap.set(v.parent_phone, new Set());
      visitMap.get(v.parent_phone)!.add(v.session_id);
    }
    for (const [phone, sessions] of visitMap) visitCounts[phone] = sessions.size;
  }

  // Group children by room
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
      room_id: r.room_id ?? null,
      child_name: r.child_name,
      parent_name: r.parent_name,
      parent_phone: r.parent_phone,
      checked_in_at: r.checked_in_at,
      checked_out_at: r.checked_out_at,
      is_new_visitor: r.is_new_visitor,
      allergies: r.allergies ?? [],
      allergy_other: r.allergy_other ?? null,
      date_of_birth: r.date_of_birth ?? null,
      visit_count: visitCounts[r.parent_phone] ?? 1,
    });
  }

  const rooms = Object.values(roomGroups).sort((a, b) => b.children.length - a.children.length);

  // Summary
  const totalChildren = allRecords.length;
  const roomsUsed = rooms.length;
  const newVisitors = allRecords.filter((r: any) => r.is_new_visitor).length;
  const returning = totalChildren - newVisitors;

  // Visitor journey — per unique family (parent_phone)
  const familyVisitCounts: Record<string, number> = {};
  for (const r of allRecords) {
    if (!familyVisitCounts[r.parent_phone]) {
      familyVisitCounts[r.parent_phone] = visitCounts[r.parent_phone] ?? 1;
    }
  }
  const journeyCounts = Object.values(familyVisitCounts);
  const visitorJourney = {
    new: journeyCounts.filter(v => v === 1).length,
    returning: journeyCounts.filter(v => v >= 2 && v <= 3).length,
    regular: journeyCounts.filter(v => v >= 4).length,
  };

  return Response.json({ session, summary: { totalChildren, roomsUsed, newVisitors, returning }, rooms, visitorJourney });
}
