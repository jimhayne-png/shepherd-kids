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

  const sessionId = request.nextUrl.searchParams.get('sessionId');
  const admin = adminClient();

  if (sessionId) {
    const { data: records } = await admin
      .from('ministry_checkin_records')
      .select('id, member_id, visitor_name')
      .eq('session_id', sessionId)
      .eq('church_id', auth.churchId);
    return Response.json({ records: records ?? [] });
  }

  const { data, error } = await admin
    .from('ministry_checkin_sessions')
    .select('*')
    .eq('church_id', auth.churchId)
    .eq('ministry_type', type)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ sessions: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { serviceName, date } = await request.json();
  if (!serviceName || !date) return Response.json({ error: 'serviceName and date required' }, { status: 400 });

  const { data, error } = await adminClient()
    .from('ministry_checkin_sessions')
    .insert({ church_id: auth.churchId, ministry_type: type, service_name: serviceName, date, status: 'open' })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ session: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const auth = await getAuth(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status, autoFollowup } = await request.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (autoFollowup !== undefined) updates.auto_followup = autoFollowup;
  if (!Object.keys(updates).length) return Response.json({ error: 'nothing to update' }, { status: 400 });

  const { data, error } = await adminClient()
    .from('ministry_checkin_sessions')
    .update(updates)
    .eq('id', id)
    .eq('church_id', auth.churchId)
    .eq('ministry_type', type)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ session: data });
}
