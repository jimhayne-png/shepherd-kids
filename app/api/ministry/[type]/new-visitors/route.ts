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

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const { data: records, error } = await admin
    .from('ministry_checkin_records')
    .select('*')
    .eq('church_id', auth.churchId)
    .eq('ministry_type', type)
    .eq('is_new_visitor', true)
    .order('checked_in_at', { ascending: false })
    .limit(500);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!records?.length) return Response.json({ sessions: [] });

  const sessionIds = [...new Set(records.map((r: any) => r.session_id as string))];

  const { data: sessions } = await admin
    .from('ministry_checkin_sessions')
    .select('id, service_name, date, auto_followup')
    .in('id', sessionIds)
    .order('date', { ascending: false });

  const sessionMap: Record<string, any> = {};
  for (const s of sessions ?? []) sessionMap[s.id] = s;

  // Followup logs for these records
  const recordIds = records.map((r: any) => r.id as string);
  const { data: logs } = await admin
    .from('ministry_visitor_followup_log')
    .select('id, record_id, status, follow_up_type, sent_at')
    .in('record_id', recordIds)
    .order('created_at', { ascending: false });

  const logMap: Record<string, any> = {};
  for (const log of logs ?? []) {
    if (!logMap[log.record_id]) logMap[log.record_id] = log;
  }

  // Group by session → individual visitors (each record is one person)
  const grouped: Record<string, any[]> = {};
  for (const r of records) {
    if (!grouped[r.session_id]) grouped[r.session_id] = [];
    grouped[r.session_id].push(r);
  }

  const result = sessionIds
    .filter(sid => sessionMap[sid])
    .map(sid => ({
      session: sessionMap[sid],
      visitors: (grouped[sid] ?? []).map((r: any) => ({
        visitorName: r.visitor_name ?? 'Unknown',
        visitorPhone: r.visitor_phone ?? null,
        visitorEmail: r.visitor_email ?? null,
        primaryRecordId: r.id,
        visitCount: r.visit_count ?? 1,
        checkedInAt: r.checked_in_at,
        followupLog: logMap[r.id] ?? null,
      })),
    }));

  return Response.json({ sessions: result });
}
