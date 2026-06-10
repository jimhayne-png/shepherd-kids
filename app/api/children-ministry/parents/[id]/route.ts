import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const { data: family, error } = await admin
    .from('cm_visitor_families')
    .select('*')
    .eq('id', id)
    .eq('church_id', auth.churchId)
    .maybeSingle();

  if (error || !family) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: children } = await admin
    .from('cm_visitor_children')
    .select('id, first_name, last_name, date_of_birth, grade, allergies, medical_notes, special_instructions')
    .eq('family_id', id)
    .eq('church_id', auth.churchId)
    .order('date_of_birth', { ascending: true });

  const childNames = (children ?? []).map((c: any) => `${c.first_name} ${c.last_name}`);
  let checkinHistory: any[] = [];

  if (childNames.length > 0) {
    const { data: checkins } = await admin
      .from('cm_checkin_records')
      .select('id, child_name, session_id, checked_in_at, room_id')
      .eq('church_id', auth.churchId)
      .in('child_name', childNames)
      .order('checked_in_at', { ascending: false })
      .limit(20);

    const sessionIds = [...new Set((checkins ?? []).map((c: any) => c.session_id as string).filter(Boolean))];
    const sessionMap: Record<string, any> = {};
    if (sessionIds.length > 0) {
      const { data: sessions } = await admin
        .from('cm_checkin_sessions')
        .select('id, service_name, date')
        .in('id', sessionIds);
      for (const s of sessions ?? []) sessionMap[s.id] = s;
    }

    checkinHistory = (checkins ?? []).map((c: any) => ({
      id: c.id,
      child_name: c.child_name,
      checked_in_at: c.checked_in_at,
      service_name: sessionMap[c.session_id]?.service_name ?? null,
      session_date: sessionMap[c.session_id]?.date ?? null,
      room_id: c.room_id,
    }));
  }

  return Response.json({ family, children: children ?? [], checkinHistory });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const admin = adminClient();

  const updateData: Record<string, any> = {};
  if ('follow_up_sent' in body) updateData.follow_up_sent = body.follow_up_sent;
  if ('next_day_sent' in body) updateData.next_day_sent = body.next_day_sent;
  if ('status' in body) updateData.status = body.status;
  if ('notes' in body) updateData.notes = body.notes;

  const { error } = await admin
    .from('cm_visitor_families')
    .update(updateData)
    .eq('id', id)
    .eq('church_id', auth.churchId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
