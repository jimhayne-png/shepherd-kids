import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

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
  const idParam = url.searchParams.get('id');

  // ?id= support for kiosk: return single session without auth
  if (idParam) {
    const { data, error } = await adminClient()
      .from('high_school_checkin_sessions')
      .select('*')
      .eq('id', idParam)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session: data ?? null });
  }

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return NextResponse.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient()
    .from('high_school_checkin_sessions')
    .select('*')
    .eq('church_id', churchId)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return NextResponse.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();

  if (body.action === 'toggle') {
    const { data: existing, error: fetchErr } = await adminClient()
      .from('high_school_checkin_sessions')
      .select('status')
      .eq('id', body.sessionId)
      .eq('church_id', churchId)
      .maybeSingle();

    if (fetchErr || !existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const newStatus = existing.status === 'open' ? 'closed' : 'open';
    const { error: updateErr } = await adminClient()
      .from('high_school_checkin_sessions')
      .update({ status: newStatus })
      .eq('id', body.sessionId)
      .eq('church_id', churchId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ success: true, status: newStatus });
  }

  // Create new session
  const { data, error } = await adminClient()
    .from('high_school_checkin_sessions')
    .insert({ church_id: churchId, name: body.name, date: body.date, status: 'open' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
