import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const { data, error } = await adminClient()
    .from('cm_visitor_checkin_tokens')
    .select('*')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ tokens: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const { label } = await req.json();
  const { data, error } = await adminClient()
    .from('cm_visitor_checkin_tokens')
    .insert({ church_id: churchId, label: label?.trim() || 'Check-In Point' })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ token: data });
}
