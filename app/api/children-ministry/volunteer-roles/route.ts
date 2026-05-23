import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const { data, error } = await adminClient().from('cm_volunteer_roles').select('*').eq('church_id', churchId).order('sort_order').order('name');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ roles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;
  const { name, description, color, sort_order } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });
  const { data, error } = await adminClient().from('cm_volunteer_roles').insert({ church_id: churchId, name: name.trim(), description: description?.trim() || null, color: color || '#6366f1', sort_order: sort_order ?? 0 }).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ role: data });
}
