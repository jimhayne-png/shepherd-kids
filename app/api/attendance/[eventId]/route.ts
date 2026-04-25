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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();

  const [eventRes, recordsRes, membersRes] = await Promise.all([
    admin
      .from('attendance_events')
      .select('id, name, event_date, check_in_token, is_open, created_at')
      .eq('id', eventId)
      .eq('church_id', churchId)
      .single(),
    admin
      .from('attendance_records')
      .select('id, member_id, guest_name, guest_email, checked_in_at, checked_in_by')
      .eq('attendance_event_id', eventId),
    admin
      .from('members')
      .select('id, first_name, last_name, photo_url, member_type, status')
      .eq('church_id', churchId)
      .eq('status', 'active')
      .order('last_name'),
  ]);

  if (eventRes.error) return Response.json({ error: 'Event not found' }, { status: 404 });

  const checkedInMemberIds = new Set(
    (recordsRes.data ?? []).filter((r: any) => r.member_id).map((r: any) => r.member_id)
  );

  const members = (membersRes.data ?? []).map((m: any) => ({
    ...m,
    checked_in: checkedInMemberIds.has(m.id),
  }));

  const guests = (recordsRes.data ?? []).filter((r: any) => !r.member_id);

  return Response.json({
    event: eventRes.data,
    members,
    guests,
    checked_in_count: checkedInMemberIds.size + guests.length,
    member_count: members.length,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { checkInOpen } = body;

  const { error } = await adminClient()
    .from('attendance_events')
    .update({ is_open: checkInOpen })
    .eq('id', eventId)
    .eq('church_id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
