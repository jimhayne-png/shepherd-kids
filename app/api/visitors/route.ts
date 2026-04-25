import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}

async function getChurchId(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.church_id ?? null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const status = request.nextUrl.searchParams.get('status');

  let query = admin
    .from('visitors')
    .select('id, first_name, last_name, email, phone, visit_date, source, department_id, status, notes, created_at, attended_event_id')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Fetch enrollment info per visitor
  const visitorIds = (data ?? []).map((v: any) => v.id);
  let enrollments: any[] = [];
  if (visitorIds.length > 0) {
    const { data: enrData } = await admin
      .from('visitor_sequence_enrollments')
      .select('id, visitor_id, sequence_id, status, current_step, enrolled_at, next_step_at, visitor_sequences(name)')
      .in('visitor_id', visitorIds)
      .eq('church_id', churchId);
    enrollments = enrData ?? [];
  }

  const enrollmentsByVisitor: Record<string, any[]> = {};
  for (const e of enrollments) {
    if (!enrollmentsByVisitor[e.visitor_id]) enrollmentsByVisitor[e.visitor_id] = [];
    enrollmentsByVisitor[e.visitor_id].push(e);
  }

  const visitors = (data ?? []).map((v: any) => ({
    ...v,
    enrollments: enrollmentsByVisitor[v.id] ?? [],
  }));

  // Stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const allVisitors = (data ?? []);
  const stats = {
    total: allVisitors.length,
    inSequence: allVisitors.filter((v: any) => v.status === 'in_sequence').length,
    convertedThisMonth: allVisitors.filter((v: any) => v.status === 'converted' && v.created_at >= monthStart).length,
    newThisMonth: allVisitors.filter((v: any) => v.status === 'new' && v.visit_date >= monthStart).length,
  };

  return Response.json({ visitors, stats });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { firstName, lastName, email, phone, visitDate, departmentId, notes } = body;

  if (!firstName?.trim() || !lastName?.trim()) {
    return Response.json({ error: 'First and last name are required' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('visitors')
    .insert({
      church_id: churchId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      visit_date: visitDate || new Date().toISOString().slice(0, 10),
      source: 'manual',
      department_id: departmentId || null,
      notes: notes?.trim() || null,
      status: 'new',
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, id: data.id });
}
