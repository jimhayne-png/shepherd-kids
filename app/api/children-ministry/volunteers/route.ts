import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const admin = adminClient();
  const { data: volunteers, error } = await admin.from('cm_volunteers').select('*').eq('church_id', churchId).order('last_name').order('first_name');
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Assignment count (last 90 days)
  const since = new Date(); since.setDate(since.getDate() - 90);
  const volIds = (volunteers ?? []).map((v: any) => v.id);
  const { data: assignments } = volIds.length
    ? await admin.from('cm_volunteer_assignments').select('volunteer_id, created_at').in('volunteer_id', volIds).gte('created_at', since.toISOString())
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const a of assignments ?? []) countMap[a.volunteer_id] = (countMap[a.volunteer_id] ?? 0) + 1;

  const enriched = (volunteers ?? []).map((v: any) => ({ ...v, assignment_count: countMap[v.id] ?? 0 }));
  return Response.json({ volunteers: enriched });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await req.json();
  const { member_id, first_name, last_name, email, phone, roles, background_check_status, background_check_date, notes } = body;
  if (!first_name?.trim() || !last_name?.trim()) return Response.json({ error: 'First and last name required' }, { status: 400 });

  const { data, error } = await adminClient().from('cm_volunteers').insert({
    church_id: churchId,
    member_id: member_id || null,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    roles: Array.isArray(roles) ? roles : [],
    background_check_status: background_check_status || 'pending',
    background_check_date: background_check_date || null,
    notes: notes?.trim() || null,
  }).select('*').single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ volunteer: data });
}
