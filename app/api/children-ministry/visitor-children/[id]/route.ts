import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  const { data: child, error: childError } = await admin
    .from('cm_visitor_children')
    .select('*')
    .eq('id', id)
    .eq('church_id', churchId)
    .maybeSingle();

  if (childError || !child) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: family } = child.family_id
    ? await admin
        .from('cm_visitor_families')
        .select('*')
        .eq('id', child.family_id)
        .maybeSingle()
    : { data: null };

  const { data: siblings } = child.family_id
    ? await admin
        .from('cm_visitor_children')
        .select('id, first_name, last_name, date_of_birth')
        .eq('family_id', child.family_id)
        .eq('church_id', churchId)
        .neq('id', id)
    : { data: [] };

  const childName = `${child.first_name} ${child.last_name}`;
  const { data: checkins } = await admin
    .from('cm_checkin_records')
    .select('id, session_id, checked_in_at, room_id, is_new_visitor, allergies, allergy_other')
    .eq('church_id', churchId)
    .eq('child_name', childName)
    .order('checked_in_at', { ascending: false })
    .limit(12);

  const sessionIds = [...new Set((checkins ?? []).map((c: any) => c.session_id as string).filter(Boolean))];
  const sessionMap: Record<string, any> = {};
  if (sessionIds.length > 0) {
    const { data: sessions } = await admin
      .from('cm_checkin_sessions')
      .select('id, service_name, date')
      .in('id', sessionIds);
    for (const s of sessions ?? []) sessionMap[s.id] = s;
  }

  const checkinHistory = (checkins ?? []).map((c: any) => ({
    id: c.id,
    checked_in_at: c.checked_in_at,
    is_new_visitor: c.is_new_visitor,
    room_id: c.room_id,
    service_name: sessionMap[c.session_id]?.service_name ?? null,
    session_date: sessionMap[c.session_id]?.date ?? null,
  }));

  return Response.json({
    child,
    family: family ?? null,
    siblings: siblings ?? [],
    checkinHistory,
  });
}
