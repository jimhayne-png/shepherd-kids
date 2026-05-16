import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

function getMinistryTables(ministryType: string) {
  if (ministryType === 'middle-school') return {
    sessions: 'middle_school_checkin_sessions',
    records: 'middle_school_checkin_records',
    students: 'middle_school_students',
  };
  if (ministryType === 'high-school') return {
    sessions: 'high_school_checkin_sessions',
    records: 'high_school_checkin_records',
    students: 'high_school_students',
  };
  return {
    sessions: 'youth_checkin_sessions',
    records: 'youth_checkin_records',
    students: 'youth_students',
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('id');
  const ministryType = url.searchParams.get('ministry_type');

  const admin = adminClient();

  // Public single-session fetch for kiosk (no auth required)
  if (sessionId) {
    for (const table of ['middle_school_checkin_sessions', 'high_school_checkin_sessions', 'youth_checkin_sessions']) {
      const { data } = await admin.from(table).select('*').eq('id', sessionId).maybeSingle();
      if (data) {
        const ministryTypeFromTable = table === 'middle_school_checkin_sessions' ? 'middle-school'
          : table === 'high_school_checkin_sessions' ? 'high-school' : data.ministry_type;
        return Response.json({ session: { ...data, ministry_type: ministryTypeFromTable } });
      }
    }
    return Response.json({ session: null });
  }

  // Authenticated fetch
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  if (ministryType) {
    const tables = getMinistryTables(ministryType);
    const { data } = await admin.from(tables.sessions).select('*').eq('church_id', churchId).order('date', { ascending: false });
    return Response.json({ sessions: (data ?? []).map(s => ({ ...s, ministry_type: ministryType })) });
  }

  // No filter — fetch from all three tables and merge
  const [ms, hs, legacy] = await Promise.all([
    admin.from('middle_school_checkin_sessions').select('*').eq('church_id', churchId).order('date', { ascending: false }),
    admin.from('high_school_checkin_sessions').select('*').eq('church_id', churchId).order('date', { ascending: false }),
    admin.from('youth_checkin_sessions').select('*').eq('church_id', churchId).order('date', { ascending: false }),
  ]);
  const all = [
    ...(ms.data ?? []).map(s => ({ ...s, ministry_type: 'middle-school' })),
    ...(hs.data ?? []).map(s => ({ ...s, ministry_type: 'high-school' })),
    ...(legacy.data ?? []),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return Response.json({ sessions: all });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const { action, sessionId, name, date, ministryType } = body;
  const mt = ministryType ?? body.ministry_type ?? 'youth';
  const tables = getMinistryTables(mt);
  const admin = adminClient();

  if (action === 'toggle') {
    for (const table of [tables.sessions, 'middle_school_checkin_sessions', 'high_school_checkin_sessions', 'youth_checkin_sessions']) {
      const { data: existing } = await admin.from(table).select('status').eq('id', sessionId).eq('church_id', churchId).maybeSingle();
      if (existing) {
        const newStatus = existing.status === 'open' ? 'closed' : 'open';
        await admin.from(table).update({ status: newStatus }).eq('id', sessionId);
        return Response.json({ success: true, status: newStatus });
      }
    }
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data, error } = await admin
    .from(tables.sessions)
    .insert({ church_id: churchId, name, date, status: 'open' })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session: { ...data, ministry_type: mt } });
}
