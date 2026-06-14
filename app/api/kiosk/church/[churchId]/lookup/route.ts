import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

type RoomRow = {
  id: string;
  name: string;
  min_age: number | null;
  max_age: number | null;
};

// Columns that exist in cm_visitor_children in production
type VisitorChildRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  allergies: string | null;         // stored as JSON.stringify(string[])
  medical_notes: string | null;
  special_instructions: string | null;
  // allergy_other does NOT exist — detail is baked into the allergies JSON array
  // authorized_pickups does NOT exist — lives in cm_checkin_records
};

// Columns confirmed in cm_checkin_records production schema
type CheckinSupplementRow = {
  child_name: string;
  room_id: string | null;
  allergies: string[] | null;       // text[] — Supabase returns as string[]
  allergy_other: string | null;
  authorized_pickups: string | null;
  medical_notes: string | null;
  // date_of_birth does NOT exist (migration not applied)
  // special_instructions does NOT exist (migration not applied)
};

function parseAllergies(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function calcRoomId(dob: string | null, rooms: RoomRow[], today: string): string | null {
  if (!dob) return null;
  try {
    const [by, bm, bd] = dob.split('-').map(Number);
    const [ty, tm, td] = today.split('-').map(Number);
    let age = ty - by;
    if (tm < bm || (tm === bm && td < bd)) age--;
    if (age < 0) return null;
    const candidates = rooms.filter((r) => {
      const minOk = r.min_age === null || age >= r.min_age;
      const maxOk = r.max_age === null || age <= r.max_age;
      return minOk && maxOk;
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const rangeA = (a.max_age ?? 999) - (a.min_age ?? 0);
      const rangeB = (b.max_age ?? 999) - (b.min_age ?? 0);
      if (rangeA !== rangeB) return rangeA - rangeB;
      return a.name.localeCompare(b.name);
    });
    return candidates[0].id;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const phone = req.nextUrl.searchParams.get('phone');

  if (!phone) {
    return Response.json({ error: 'phone required' }, { status: 400 });
  }

  const normalizedPhone = phone.replace(/\D/g, '');
  const debug = req.nextUrl.searchParams.get('debug') === '1';
  const admin = adminClient();

  console.log('[lookup]', { churchId, phoneLast4: normalizedPhone.slice(-4) });

  // Fetch timezone + active rooms in parallel (rooms needed for DOB-based room assignment)
  const [{ data: churchRow }, { data: activeRoomsRaw }] = await Promise.all([
    admin.from('churches').select('timezone').eq('id', churchId).maybeSingle(),
    admin
      .from('cm_checkin_rooms')
      .select('id, name, min_age, max_age')
      .eq('church_id', churchId)
      .eq('is_active', true),
  ]);

  const tz = (churchRow as { timezone?: string } | null)?.timezone ?? 'America/Los_Angeles';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  const activeRooms = (activeRoomsRaw ?? []) as RoomRow[];

  // ── Path 1: Visitor family record ────────────────────────────────────────────

  const { data: family, error: familyError } = await admin
    .from('cm_visitor_families')
    .select('id, parent1_first_name, parent1_last_name, parent1_phone')
    .eq('church_id', churchId)
    .eq('parent1_phone', normalizedPhone)
    .maybeSingle();

  if (familyError) console.error('[lookup] cm_visitor_families error:', familyError.message);
  console.log('[lookup] family found:', !!family);

  if (family) {
    const f = family as {
      id: string;
      parent1_first_name: string;
      parent1_last_name: string;
      parent1_phone: string;
    };

    // Fetch visitor children + most-recent check-in records in parallel.
    // Check-in records supplement: room_id, allergy_other, authorized_pickups, and
    // allergies (as text[]) when the visitor record is missing them.
    const [
      { data: visitorChildren, error: childrenError },
      { data: recentCheckins },
    ] = await Promise.all([
      admin
        .from('cm_visitor_children')
        .select('id, first_name, last_name, date_of_birth, allergies, medical_notes, special_instructions')
        .eq('family_id', f.id)
        .order('created_at', { ascending: true }),
      admin
        .from('cm_checkin_records')
        .select('child_name, room_id, allergies, allergy_other, authorized_pickups, medical_notes')
        .eq('church_id', churchId)
        .eq('parent_phone', normalizedPhone)
        .order('checked_in_at', { ascending: false })
        .limit(50),
    ]);

    if (childrenError) console.error('[lookup] cm_visitor_children error:', childrenError.message);
    console.log('[lookup] visitor children:', visitorChildren?.length ?? 0, 'checkin records:', recentCheckins?.length ?? 0);

    if (visitorChildren?.length) {
      // Most-recent check-in record per child name (keyed lowercase)
      const supplementMap = new Map<string, CheckinSupplementRow>();
      for (const r of ((recentCheckins ?? []) as CheckinSupplementRow[])) {
        const key = (r.child_name ?? '').trim().toLowerCase();
        if (!supplementMap.has(key)) supplementMap.set(key, r);
      }

      const children = (visitorChildren as VisitorChildRow[]).map((c) => {
        const childName = `${c.first_name} ${c.last_name}`.trim();
        const sup = supplementMap.get(childName.toLowerCase());

        // Allergies: visitor record stores JSON string; checkin record stores text[].
        const visitorAllergies = parseAllergies(c.allergies);
        const allergies = visitorAllergies.length > 0 ? visitorAllergies : (sup?.allergies ?? []);

        // Room: most recent checkin record wins; fall back to DOB calculation.
        const roomId = sup?.room_id ?? calcRoomId(c.date_of_birth, activeRooms, today) ?? '';

        return {
          id: c.id,
          childId: c.id,
          name: childName,
          firstName: c.first_name,
          lastName: c.last_name,
          dateOfBirth: c.date_of_birth ?? null,
          allergies,
          allergyOther: sup?.allergy_other ?? '',
          medicalNotes: c.medical_notes ?? sup?.medical_notes ?? '',
          specialInstructions: c.special_instructions ?? '',
          authorizedPickups: sup?.authorized_pickups ?? '',
          roomId,
        };
      });

      return Response.json({
        found: true,
        parentFirstName: f.parent1_first_name,
        parentLastName: f.parent1_last_name,
        parentPhone: f.parent1_phone,
        children,
        ...(debug ? { _debug: { source: 'cm_visitor_families', familyId: f.id, childCount: children.length, today, tz } } : {}),
      });
    }
  }

  // ── Path 2: Fallback from check-in records (families pre-dating visitor tracking) ──

  const { data: records, error: recordsError } = await admin
    .from('cm_checkin_records')
    .select('parent_name, parent_phone, child_name, room_id, allergies, allergy_other, authorized_pickups, medical_notes')
    .eq('church_id', churchId)
    .eq('parent_phone', normalizedPhone)
    .order('checked_in_at', { ascending: false })
    .limit(50);

  if (recordsError) console.error('[lookup] cm_checkin_records fallback error:', recordsError.message);
  console.log('[lookup] checkin records fallback count:', records?.length ?? 0);

  if (!records?.length) {
    return Response.json({
      found: false,
      ...(debug ? { _debug: { familyError: familyError?.message, recordsError: recordsError?.message } } : {}),
    });
  }

  type FallbackRow = CheckinSupplementRow & { parent_name: string | null; parent_phone: string | null };
  const checkinRecords = records as FallbackRow[];
  const first = checkinRecords[0];
  const parts = (first.parent_name ?? '').trim().split(/\s+/);

  const seen = new Set<string>();
  const children: {
    name: string;
    firstName: string;
    lastName: string;
    dateOfBirth: null;
    allergies: string[];
    allergyOther: string;
    medicalNotes: string;
    specialInstructions: string;
    authorizedPickups: string;
    roomId: string;
  }[] = [];

  for (const r of checkinRecords) {
    const childName = (r.child_name ?? '').trim();
    if (!childName || seen.has(childName)) continue;
    seen.add(childName);
    const childParts = childName.split(/\s+/);
    children.push({
      name: childName,
      firstName: childParts[0] ?? '',
      lastName: childParts.slice(1).join(' '),
      dateOfBirth: null,
      allergies: r.allergies ?? [],
      allergyOther: r.allergy_other ?? '',
      medicalNotes: r.medical_notes ?? '',
      specialInstructions: '',
      authorizedPickups: r.authorized_pickups ?? '',
      roomId: r.room_id ?? '',
    });
  }

  return Response.json({
    found: true,
    parentFirstName: parts[0] ?? '',
    parentLastName: parts.slice(1).join(' '),
    parentPhone: first.parent_phone,
    children,
    ...(debug ? { _debug: { source: 'cm_checkin_records', childCount: children.length } } : {}),
  });
}
