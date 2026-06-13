import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const childId = request.nextUrl.searchParams.get('child_id');
  const admin = adminClient();

  let query = admin
    .from('children_ministry_attendance')
    .select('*')
    .eq('church_id', churchId)
    .order('session_date', { ascending: false });

  if (childId) query = query.eq('child_id', childId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ attendance: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const body = await request.json();
  const { childId, sessionDate, present } = body;

  if (!childId || !sessionDate) return Response.json({ error: 'childId and sessionDate required' }, { status: 400 });

  const admin = adminClient();

  const { data: existing } = await admin
    .from('children_ministry_attendance')
    .select('id, consecutive_weeks')
    .eq('child_id', childId)
    .eq('session_date', sessionDate)
    .maybeSingle();

  let consecutiveWeeks = 1;

  if (present !== false) {
    const { data: recentAtt } = await admin
      .from('children_ministry_attendance')
      .select('session_date, present')
      .eq('child_id', childId)
      .eq('present', true)
      .order('session_date', { ascending: false })
      .limit(30);

    const presentDates = (recentAtt ?? [])
      .map((a: any) => a.session_date)
      .filter((d: string) => d !== sessionDate)
      .sort()
      .reverse();

    let streak = 1;
    let prev = new Date(sessionDate + 'T00:00:00');
    for (const dateStr of presentDates) {
      const d = new Date(dateStr + 'T00:00:00');
      const diff = Math.round((prev.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 6 && diff <= 8) {
        streak++;
        prev = d;
      } else {
        break;
      }
    }
    consecutiveWeeks = streak;
  }

  let record;
  if (existing) {
    const { data } = await admin
      .from('children_ministry_attendance')
      .update({ present: present !== false, consecutive_weeks: consecutiveWeeks })
      .eq('id', existing.id)
      .select('*')
      .single();
    record = data;
  } else {
    const { data } = await admin
      .from('children_ministry_attendance')
      .insert({ church_id: churchId, child_id: childId, session_date: sessionDate, present: present !== false, consecutive_weeks: consecutiveWeeks })
      .select('*')
      .single();
    record = data;
  }

  return Response.json({ record, consecutiveWeeks });
}
