import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) {
  const { volunteerId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const { data, error } = await adminClient().from('cm_volunteer_availability').select('*').eq('volunteer_id', volunteerId).eq('church_id', churchId).order('unavailable_date');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ availability: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) {
  const { volunteerId } = await params;
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const { unavailable_date, reason } = await req.json();
  if (!unavailable_date) return Response.json({ error: 'unavailable_date required' }, { status: 400 });
  const { data, error } = await adminClient().from('cm_volunteer_availability').insert({ church_id: churchId, volunteer_id: volunteerId, unavailable_date, reason: reason?.trim() || null }).select('*').single();
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Already marked unavailable for this date' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ availability: data });
}
