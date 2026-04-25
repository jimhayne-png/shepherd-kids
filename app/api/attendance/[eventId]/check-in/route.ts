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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { memberId, guestName, guestEmail } = body;

  const admin = adminClient();

  // Verify event belongs to this church
  const { data: event } = await admin
    .from('attendance_events')
    .select('id')
    .eq('id', eventId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  if (memberId) {
    // Toggle: check if already checked in
    const { data: existing } = await admin
      .from('attendance_records')
      .select('id')
      .eq('attendance_event_id', eventId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (existing) {
      await admin.from('attendance_records').delete().eq('id', existing.id);
      return Response.json({ action: 'unchecked' });
    } else {
      await admin.from('attendance_records').insert({
        attendance_event_id: eventId,
        church_id: churchId,
        member_id: memberId,
        checked_in_by: user.id,
      });
      return Response.json({ action: 'checked' });
    }
  } else if (guestName?.trim()) {
    const { error } = await admin.from('attendance_records').insert({
      attendance_event_id: eventId,
      church_id: churchId,
      guest_name: guestName.trim(),
      guest_email: guestEmail?.trim() || null,
      checked_in_by: user.id,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ action: 'guest_added' });
  }

  return Response.json({ error: 'memberId or guestName required' }, { status: 400 });
}
