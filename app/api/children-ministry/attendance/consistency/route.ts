import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

type AttRow = { child_id: string; session_date: string; present: boolean };
type AllAttRow = { child_id: string; session_date: string };
type ChildRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  date_of_birth: string | null;
  parent1_name: string | null;
  parent1_phone: string | null;
  parent1_email: string | null;
  parent2_name: string | null;
  allergies: string | null;
  medical_notes: string | null;
};

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  // 8 most recent distinct session_dates from manual attendance
  const { data: dateRows } = await admin
    .from('children_ministry_attendance')
    .select('session_date')
    .eq('church_id', churchId)
    .order('session_date', { ascending: false });

  const seen = new Set<string>();
  const periods: string[] = [];
  for (const r of (dateRows ?? []) as { session_date: string }[]) {
    if (!seen.has(r.session_date)) {
      seen.add(r.session_date);
      periods.push(r.session_date);
      if (periods.length === 8) break;
    }
  }

  // Active children ordered by last name
  const { data: childRows } = await admin
    .from('children_ministry_children')
    .select('id, first_name, last_name, grade, date_of_birth, parent1_name, parent1_phone, parent1_email, parent2_name, allergies, medical_notes')
    .eq('church_id', churchId)
    .eq('active', true)
    .order('last_name');

  const children = (childRows ?? []) as ChildRow[];

  if (!children.length || !periods.length) {
    return Response.json({ periods, children: [] });
  }

  const childIds = children.map(c => c.id);

  // Attendance for the 8 periods
  const { data: periodAtt } = await admin
    .from('children_ministry_attendance')
    .select('child_id, session_date, present')
    .eq('church_id', churchId)
    .in('session_date', periods)
    .in('child_id', childIds);

  // All-time present records to derive first / last attendance dates
  const { data: allAtt } = await admin
    .from('children_ministry_attendance')
    .select('child_id, session_date')
    .eq('church_id', churchId)
    .in('child_id', childIds)
    .eq('present', true)
    .order('session_date', { ascending: true });

  const firstDate: Record<string, string> = {};
  const lastDate: Record<string, string> = {};
  for (const r of (allAtt ?? []) as AllAttRow[]) {
    if (!firstDate[r.child_id]) firstDate[r.child_id] = r.session_date;
    lastDate[r.child_id] = r.session_date; // ascending order → last write = most recent
  }

  const attMap: Record<string, Record<string, boolean>> = {};
  for (const r of (periodAtt ?? []) as AttRow[]) {
    if (!attMap[r.child_id]) attMap[r.child_id] = {};
    attMap[r.child_id][r.session_date] = r.present;
  }

  const oldestPeriod = periods[periods.length - 1] ?? '';

  const result = children.map(c => {
    const childAtt = attMap[c.id] ?? {};
    const attendance = periods.map(p => childAtt[p] === true);
    const total_present = attendance.filter(Boolean).length;
    const pct = periods.length > 0 ? Math.round((total_present / periods.length) * 100) : 0;
    const first_attendance_date = firstDate[c.id] ?? null;
    const last_attendance_date = lastDate[c.id] ?? null;
    const has_care_notes = !!(c.allergies || c.medical_notes);

    let category: 'new_visitor' | 'regular' | 'inconsistent' | 'needs_attention';
    if (first_attendance_date && first_attendance_date >= oldestPeriod) {
      category = 'new_visitor';
    } else if (total_present >= 6) {
      category = 'regular';
    } else if (total_present >= 3) {
      category = 'inconsistent';
    } else {
      category = 'needs_attention';
    }

    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      grade: c.grade,
      date_of_birth: c.date_of_birth,
      parent1_name: c.parent1_name,
      parent1_phone: c.parent1_phone,
      parent1_email: c.parent1_email,
      parent2_name: c.parent2_name,
      attendance,
      total_present,
      pct,
      first_attendance_date,
      last_attendance_date,
      has_care_notes,
      category,
    };
  });

  return Response.json({ periods, children: result });
}
