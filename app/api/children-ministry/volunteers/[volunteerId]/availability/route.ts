import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) {
  const { volunteerId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });
  const { data, error } = await adminClient().from('cm_volunteer_availability').select('*').eq('volunteer_id', volunteerId).eq('church_id', churchId).order('unavailable_date');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ availability: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) {
  const { volunteerId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });
  const { unavailable_date, reason } = await req.json();
  if (!unavailable_date) return Response.json({ error: 'unavailable_date required' }, { status: 400 });
  const { data, error } = await adminClient().from('cm_volunteer_availability').insert({ church_id: churchId, volunteer_id: volunteerId, unavailable_date, reason: reason?.trim() || null }).select('*').single();
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Already marked unavailable for this date' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ availability: data });
}
