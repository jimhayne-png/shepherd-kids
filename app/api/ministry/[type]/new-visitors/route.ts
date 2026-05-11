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

  const admin = adminClient();

  const { data: visitors, error } = await admin
    .from('ministry_visitors')
    .select('id, first_name, last_name, email, phone, visit_count, first_visit_date, last_visit_date, status, notes')
    .eq('church_id', auth.churchId)
    .eq('ministry_type', type)
    .eq('promoted_to_member', false)
    .order('last_visit_date', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const visitorIds = (visitors ?? []).map((v: any) => v.id as string);

  const { data: attendance } = visitorIds.length
    ? await admin
        .from('ministry_visitor_attendance')
        .select('visitor_id, session_date')
        .in('visitor_id', visitorIds)
        .order('session_date', { ascending: false })
    : { data: [] };

  const attendanceMap: Record<string, string[]> = {};
  for (const a of attendance ?? []) {
    if (!attendanceMap[a.visitor_id]) attendanceMap[a.visitor_id] = [];
    attendanceMap[a.visitor_id].push(a.session_date);
  }

  const result = (visitors ?? []).map((v: any) => ({
    id: v.id,
    first_name: v.first_name,
    last_name: v.last_name,
    email: v.email,
    phone: v.phone,
    visit_count: v.visit_count,
    first_visit_date: v.first_visit_date,
    last_visit_date: v.last_visit_date,
    status: v.status,
    notes: v.notes,
    attendance: attendanceMap[v.id] ?? [],
  }));

  return Response.json(result);
}
