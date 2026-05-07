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
  const sessionId = request.nextUrl.searchParams.get('id');

  // Kiosk: fetch single session by ID without auth (needed for PIN verification and session info)
  if (sessionId) {
    const { data, error } = await adminClient()
      .from('cm_checkin_sessions')
      .select('id, service_name, date, scheduled_time, status, kiosk_pin, church_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (error || !data) return Response.json({ error: 'Session not found' }, { status: 404 });
    return Response.json({ session: data });
  }

  // Admin: list sessions for church
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await adminClient()
    .from('cm_checkin_sessions')
    .select('*')
    .eq('church_id', auth.churchId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ sessions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { serviceName, serviceTemplateId, date, scheduledTime, kioskPin } = await request.json();
  if (!serviceName || !date || !kioskPin) {
    return Response.json({ error: 'serviceName, date, and kioskPin required' }, { status: 400 });
  }
  if (!/^\d{4}$/.test(kioskPin)) {
    return Response.json({ error: 'kioskPin must be exactly 4 digits' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('cm_checkin_sessions')
    .insert({
      church_id: auth.churchId,
      service_name: serviceName,
      service_template_id: serviceTemplateId ?? null,
      date,
      scheduled_time: scheduledTime ?? null,
      kiosk_pin: kioskPin,
      status: 'open',
    })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ session: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await request.json();
  if (!id || !status) return Response.json({ error: 'id and status required' }, { status: 400 });
  if (!['open', 'closed'].includes(status)) return Response.json({ error: 'status must be open or closed' }, { status: 400 });

  const { data, error } = await adminClient()
    .from('cm_checkin_sessions')
    .update({ status })
    .eq('id', id)
    .eq('church_id', auth.churchId)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ session: data });
}
