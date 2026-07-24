import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

// Category type — expand here when adding new tiers (e.g. 'excellent' | 'healthy' | 'watch' | 'follow_up' | 'missing')
type Category = 'new_visitor' | 'regular' | 'inconsistent' | 'needs_attention';

// Isolated so thresholds and tier names can be updated in one place
function classifyAttendance(
  totalPresent: number,
  periodCount: number,
  firstAttDate: string | null,
  oldestPeriod: string,
): Category {
  if (firstAttDate && firstAttDate >= oldestPeriod) return 'new_visitor';
  if (periodCount === 0) return 'needs_attention';
  if (totalPresent >= 6) return 'regular';
  if (totalPresent >= 3) return 'inconsistent';
  return 'needs_attention';
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

type ChildRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  date_of_birth: string | null;
  allergies: string | null;
  medical_notes: string | null;
  family_id: string | null;
};

type FamilyRow = {
  id: string;
  parent1_first_name: string;
  parent1_last_name: string;
  parent1_phone: string | null;
  parent1_email: string | null;
  parent2_first_name: string | null;
  parent2_last_name: string | null;
};

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  // Canonical children — cm_visitor_children is the source of truth for the
  // dashboard's child roster (see cm_visitor_children_safety_fields migration
  // notes); children_ministry_children is legacy-only and no longer written to.
  // Only children expected to attend regularly are evaluated for consistency —
  // visitors and inactive children keep their check-in history and can still
  // check in, they're just excluded from missed-attendance calculations.
  const { data: childRows } = await admin
    .from('cm_visitor_children')
    .select('id, first_name, last_name, grade, date_of_birth, allergies, medical_notes, family_id')
    .eq('church_id', churchId)
    .eq('attendance_status', 'regular')
    .order('last_name');

  const children = (childRows ?? []) as ChildRow[];

  if (!children.length) {
    return Response.json({ periods: [], children: [] });
  }

  const familyIds = [...new Set(children.map(c => c.family_id).filter((id): id is string => !!id))];
  const familyMap = new Map<string, FamilyRow>();
  if (familyIds.length > 0) {
    const { data: familyRows } = await admin
      .from('cm_visitor_families')
      .select('id, parent1_first_name, parent1_last_name, parent1_phone, parent1_email, parent2_first_name, parent2_last_name')
      .in('id', familyIds);
    for (const f of (familyRows ?? []) as FamilyRow[]) familyMap.set(f.id, f);
  }

  // Sessions define the attendance periods and let us resolve a checkin
  // record's session_id back to a calendar date.
  const { data: sessionRows } = await admin
    .from('cm_checkin_sessions')
    .select('id, date')
    .eq('church_id', churchId)
    .order('date', { ascending: false });

  const sessionDateMap = new Map<string, string>();
  const seenDates = new Set<string>();
  const periods: string[] = [];
  for (const s of (sessionRows ?? []) as { id: string; date: string }[]) {
    sessionDateMap.set(s.id, s.date);
    if (!seenDates.has(s.date)) {
      seenDates.add(s.date);
      if (periods.length < 8) periods.push(s.date);
    }
  }

  // Children exist but no check-in sessions yet — return children so the UI
  // can show its "no history yet" explainer rather than hiding them.
  if (!periods.length) {
    const emptyChildren = children.map(c => {
      const family = c.family_id ? familyMap.get(c.family_id) : undefined;
      return {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        grade: c.grade,
        date_of_birth: c.date_of_birth,
        parent1_name: family ? `${family.parent1_first_name} ${family.parent1_last_name}`.trim() : null,
        parent1_phone: family?.parent1_phone ?? null,
        parent1_email: family?.parent1_email ?? null,
        parent2_name: family?.parent2_first_name ? `${family.parent2_first_name} ${family.parent2_last_name ?? ''}`.trim() : null,
        attendance: [] as boolean[],
        total_present: 0,
        pct: 0,
        first_attendance_date: null as string | null,
        last_attendance_date: null as string | null,
        has_care_notes: !!(c.allergies || c.medical_notes),
        category: 'needs_attention' as const,
      };
    });
    return Response.json({ periods: [], children: emptyChildren });
  }

  // Check-in records are matched by name (cm_checkin_records has no child_id
  // column), normalized to be resilient to whitespace/case differences.
  const { data: recordRows } = await admin
    .from('cm_checkin_records')
    .select('child_name, session_id, checked_in_at')
    .eq('church_id', churchId)
    .order('checked_in_at', { ascending: true })
    .limit(5000);

  const presentDatesByName = new Map<string, Set<string>>();
  const firstDateByName = new Map<string, string>();
  const lastDateByName = new Map<string, string>();

  for (const r of (recordRows ?? []) as { child_name: string; session_id: string; checked_in_at: string }[]) {
    const date = sessionDateMap.get(r.session_id);
    if (!date) continue;
    const key = normalizeName(r.child_name);
    if (!presentDatesByName.has(key)) presentDatesByName.set(key, new Set());
    presentDatesByName.get(key)!.add(date);
    if (!firstDateByName.has(key)) firstDateByName.set(key, date); // ascending order → first write = earliest
    lastDateByName.set(key, date); // ascending order → last write = most recent
  }

  const oldestPeriod = periods[periods.length - 1] ?? '';

  const result = children.map(c => {
    const key = normalizeName(`${c.first_name} ${c.last_name}`);
    const presentDates = presentDatesByName.get(key) ?? new Set<string>();
    const attendance = periods.map(p => presentDates.has(p));
    const total_present = attendance.filter(Boolean).length;
    const pct = periods.length > 0 ? Math.round((total_present / periods.length) * 100) : 0;
    const first_attendance_date = firstDateByName.get(key) ?? null;
    const last_attendance_date = lastDateByName.get(key) ?? null;
    const has_care_notes = !!(c.allergies || c.medical_notes);
    const family = c.family_id ? familyMap.get(c.family_id) : undefined;

    const category = classifyAttendance(total_present, periods.length, first_attendance_date, oldestPeriod);

    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      grade: c.grade,
      date_of_birth: c.date_of_birth,
      parent1_name: family ? `${family.parent1_first_name} ${family.parent1_last_name}`.trim() : null,
      parent1_phone: family?.parent1_phone ?? null,
      parent1_email: family?.parent1_email ?? null,
      parent2_name: family?.parent2_first_name ? `${family.parent2_first_name} ${family.parent2_last_name ?? ''}`.trim() : null,
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
