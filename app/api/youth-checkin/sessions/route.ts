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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('id');

  const admin = adminClient();

  // Allow fetching a single session by id without auth (for kiosk)
  if (sessionId) {
    const { data } = await admin
      .from('youth_checkin_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    return Response.json({ session: data });
  }

  // Authenticated list fetch
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data } = await admin
    .from('youth_checkin_sessions')
    .select('*')
    .eq('church_id', churchId)
    .order('date', { ascending: false });

  return Response.json({ sessions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const { action, sessionId, name, date, ministryType } = body;

  const admin = adminClient();

  if (action === 'toggle') {
    const { data: existing } = await admin
      .from('youth_checkin_sessions')
      .select('status')
      .eq('id', sessionId)
      .eq('church_id', churchId)
      .single();
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
    const newStatus = existing.status === 'open' ? 'closed' : 'open';
    await admin.from('youth_checkin_sessions').update({ status: newStatus }).eq('id', sessionId);
    return Response.json({ success: true, status: newStatus });
  }

  // Create new session
  const { data, error } = await admin
    .from('youth_checkin_sessions')
    .insert({
      church_id: churchId,
      ministry_type: ministryType,
      name,
      date,
      status: 'open',
    })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session: data });
}
