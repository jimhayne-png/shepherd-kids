import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .select('*')
    .eq('church_id', auth.churchId)
    .eq('is_new_visitor', true)
    .order('checked_in_at', { ascending: false })
    .limit(500);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!records?.length) return Response.json({ sessions: [] });

  const sessionIds = [...new Set(records.map((r: any) => r.session_id as string))];

  const { data: sessions } = await admin
    .from('cm_checkin_sessions')
    .select('id, service_name, date, auto_followup')
    .in('id', sessionIds)
    .order('date', { ascending: false });

  const sessionMap: Record<string, any> = {};
  for (const s of sessions ?? []) sessionMap[s.id] = s;

  const roomIds = [...new Set(records.map((r: any) => r.room_id).filter(Boolean) as string[])];
  const roomNameMap: Record<string, string> = {};
  if (roomIds.length) {
    const { data: rooms } = await admin.from('cm_checkin_rooms').select('id, name').in('id', roomIds);
    for (const room of rooms ?? []) roomNameMap[room.id] = room.name;
  }

  const recordIds = records.map((r: any) => r.id as string);
  const { data: logs } = await admin
    .from('cm_followup_log')
    .select('id, record_id, status, follow_up_type, sent_at, parent_email')
    .in('record_id', recordIds)
    .order('created_at', { ascending: false });

  // Take only the most recent log per record_id
  const logMap: Record<string, any> = {};
  for (const log of logs ?? []) {
    if (!logMap[log.record_id]) logMap[log.record_id] = log;
  }

  // Visit counts: distinct sessions per parent_phone across all time
  const phones = [...new Set(records.map((r: any) => r.parent_phone as string))];
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

  // Group: sessionId → parentPhone → records[]
  const grouped: Record<string, Record<string, any[]>> = {};
  for (const r of records) {
    if (!grouped[r.session_id]) grouped[r.session_id] = {};
    if (!grouped[r.session_id][r.parent_phone]) grouped[r.session_id][r.parent_phone] = [];
    grouped[r.session_id][r.parent_phone].push(r);
  }

  const result = sessionIds
    .filter(sid => sessionMap[sid])
    .map(sid => {
      const families = Object.entries(grouped[sid] ?? {}).map(([phone, recs]) => {
        const first = (recs as any[])[0];
        const familyLog = (recs as any[]).map(r => logMap[r.id]).find(Boolean) ?? null;
        return {
          parentName: first.parent_name as string,
          parentPhone: phone,
          primaryRecordId: first.id as string,
          children: (recs as any[]).map(r => ({
            id: r.id,
            child_name: r.child_name,
            room_id: r.room_id ?? null,
            room_name: r.room_id ? (roomNameMap[r.room_id] ?? null) : null,
            checked_in_at: r.checked_in_at,
          })),
          followupLog: familyLog,
          visitCount: visitCounts[phone] ?? 1,
        };
      });
      return { session: sessionMap[sid], families };
    });

  return Response.json({ sessions: result });
}
