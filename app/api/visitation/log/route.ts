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

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const {
    memberId,
    contactType,
    contactDate,
    notes,
    followUpNeeded,
    followUpAt,
    followUpNotes,
    assignedTo,
  } = body;

  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });
  if (!contactType) return Response.json({ error: 'contactType required' }, { status: 400 });
  if (!contactDate) return Response.json({ error: 'contactDate required' }, { status: 400 });

  // Verify member belongs to this church
  const { data: member } = await adminClient()
    .from('members')
    .select('id')
    .eq('id', memberId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  const [logRes] = await Promise.all([
    adminClient()
      .from('visitation_logs')
      .insert({
        church_id: churchId,
        member_id: memberId,
        contact_type: contactType,
        contact_date: contactDate,
        notes: notes?.trim() || null,
        follow_up_needed: followUpNeeded ?? false,
        follow_up_at: followUpNeeded && followUpAt ? followUpAt : null,
        follow_up_notes: followUpNeeded && followUpNotes ? followUpNotes.trim() : null,
        assigned_to: assignedTo ?? null,
        logged_by: user.id,
      })
      .select('id')
      .single(),

    adminClient()
      .from('members')
      .update({ last_contacted_at: new Date(contactDate).toISOString() })
      .eq('id', memberId)
      .eq('church_id', churchId),
  ]);

  if (logRes.error) return Response.json({ error: logRes.error.message }, { status: 400 });
  return Response.json({ success: true, id: logRes.data.id });
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const url = new URL(request.url);
  const memberId = url.searchParams.get('memberId');

  let query = adminClient()
    .from('visitation_logs')
    .select(`
      id, contact_type, contact_date, notes, follow_up_needed,
      follow_up_at, follow_up_notes, assigned_to, created_at,
      members!visitation_logs_assigned_to_fkey(first_name, last_name)
    `)
    .eq('church_id', churchId)
    .order('contact_date', { ascending: false });

  if (memberId) query = query.eq('member_id', memberId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ logs: data ?? [] });
}
