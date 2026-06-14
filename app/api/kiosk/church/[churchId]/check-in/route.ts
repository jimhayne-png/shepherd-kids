import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

type ChildInput = {
  childId?: string;
  firstName?: string;
  lastName?: string;
  childFirstName?: string;
  childLastName?: string;
  childName?: string;
  dateOfBirth?: string;
  childDateOfBirth?: string;
  roomId?: string;
  allergies?: string[];
  allergyOther?: string;
  medicalNotes?: string;
  specialInstructions?: string;
  authorizedPickups?: string;
};

type RoomRow = {
  id: string;
  name: string;
  min_age: number | null;
  max_age: number | null;
};

type ImmediateLabel = {
  labelType: 'child' | 'parent';
  childName: string;
  parentName: string;
  parentPhone: string | null;
  roomName: string | null;
  securityCode: string;
  allergies: string | null;
  medicalNotes: string | null;
  specialInstructions: string | null;
  visitNumber: number | null;
  qrToken: string | null;
};

function clean(value: string | undefined | null): string {
  return value?.trim() ?? '';
}

function childFirstName(child: ChildInput): string {
  if (clean(child.firstName)) return clean(child.firstName);
  if (clean(child.childFirstName)) return clean(child.childFirstName);
  if (clean(child.childName)) return clean(child.childName).split(/\s+/)[0] ?? '';
  return '';
}

function childLastName(child: ChildInput): string {
  if (clean(child.lastName)) return clean(child.lastName);
  if (clean(child.childLastName)) return clean(child.childLastName);
  if (clean(child.childName)) return clean(child.childName).split(/\s+/).slice(1).join(' ');
  return '';
}

function childFullName(child: ChildInput): string {
  return `${childFirstName(child)} ${childLastName(child)}`.trim();
}

function childBirthDate(child: ChildInput): string | null {
  return child.dateOfBirth || child.childDateOfBirth || null;
}

function allergyArray(child: ChildInput): string[] {
  return (child.allergies ?? []).map((a) =>
    a === 'Other' && clean(child.allergyOther)
      ? `Other: ${clean(child.allergyOther)}`
      : a,
  );
}

function allergyLine(
  allergies: string[] | undefined,
  allergyOther: string | undefined,
): string | null {
  const list = (allergies ?? []).map((a) =>
    a === 'Other' && clean(allergyOther)
      ? `Other: ${clean(allergyOther)}`
      : a,
  );

  return list.length ? list.join(', ') : null;
}

function allergyProfileValue(child: ChildInput): string {
  return JSON.stringify(allergyArray(child));
}

function errorDetails(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return 'Unknown object error';
    }
  }

  return String(err);
}

/**
 * Calculates age in whole years as of `today` (YYYY-MM-DD in church timezone).
 * Returns null if dateOfBirth is missing or unparseable.
 */
function calculateAge(dateOfBirth: string | null, today: string): number | null {
  if (!dateOfBirth) return null;
  try {
    const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
    const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
    let age = todayYear - birthYear;
    // Subtract 1 if the birthday hasn't occurred yet this year
    if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

/**
 * Determines the correct room for a child.
 * Priority:
 *   1. If child.roomId is provided and exists in activeRooms, use it (validated override).
 *   2. Auto-assign based on date_of_birth using church-timezone today.
 *      - Picks the narrowest age-range match, then alphabetical on ties.
 *   3. Returns null if no DOB and no valid override.
 */
function findRoomForChild(child: ChildInput, rooms: RoomRow[], today: string): string | null {
  // Validated manual override
  if (child.roomId && rooms.find((r) => r.id === child.roomId)) {
    return child.roomId;
  }

  // Age-based auto-placement
  const dob = childBirthDate(child);
  const age = calculateAge(dob, today);
  if (age === null) return null;

  const candidates = rooms.filter((r) => {
    const minOk = r.min_age === null || age >= r.min_age;
    const maxOk = r.max_age === null || age <= r.max_age;
    return minOk && maxOk;
  });

  if (!candidates.length) return null;

  // Narrowest range wins; alphabetical on tie
  candidates.sort((a, b) => {
    const rangeA = (a.max_age ?? 999) - (a.min_age ?? 0);
    const rangeB = (b.max_age ?? 999) - (b.min_age ?? 0);
    if (rangeA !== rangeB) return rangeA - rangeB;
    return a.name.localeCompare(b.name);
  });

  return candidates[0].id;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const body = await req.json();

  const {
    parentFirstName,
    parentLastName,
    parentPhone,
    parentEmail,
    sessionIds,
    children,
  } = body as {
    parentFirstName: string;
    parentLastName: string;
    parentPhone: string;
    parentEmail?: string;
    sessionIds: string[];
    children: ChildInput[];
  };

  if (
    !clean(parentFirstName) ||
    !clean(parentLastName) ||
    !clean(parentPhone) ||
    !sessionIds?.length ||
    !children?.length
  ) {
    return Response.json(
      {
        error:
          'parentFirstName, parentLastName, parentPhone, sessionIds, and children are required',
      },
      { status: 400 },
    );
  }

  const admin = adminClient();

  const { data: churchRow } = await admin
    .from('churches')
    .select('timezone')
    .eq('id', churchId)
    .maybeSingle();

  const tz =
    (churchRow as { timezone?: string } | null)?.timezone ??
    'America/Los_Angeles';

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
  }).format(new Date());

  const [{ data: validSessions }, { data: activeRoomsRaw }] = await Promise.all([
    admin
      .from('cm_checkin_sessions')
      .select('id')
      .eq('church_id', churchId)
      .eq('date', today)
      .eq('status', 'open')
      .in('id', sessionIds),
    admin
      .from('cm_checkin_rooms')
      .select('id, name, min_age, max_age')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('min_age', { ascending: true }),
  ]);

  const activeRooms = (activeRoomsRaw ?? []) as RoomRow[];

  const validIds = new Set(
    ((validSessions ?? []) as { id: string }[]).map((s) => s.id),
  );

  const invalidIds = sessionIds.filter((id) => !validIds.has(id));

  if (invalidIds.length) {
    return Response.json(
      { error: 'One or more sessions are not valid for this church today' },
      { status: 400 },
    );
  }

  function roomNameFor(roomId: string | null | undefined): string | null {
    if (!roomId) return null;
    return activeRooms.find((r) => r.id === roomId)?.name ?? null;
  }

  const normalizedPhone = parentPhone.replace(/\D/g, '');
  const parentName = `${clean(parentFirstName)} ${clean(parentLastName)}`.trim();
  const securityCode = String(Math.floor(100000 + Math.random() * 900000));

  const checkinRows = sessionIds.flatMap((sessionId) =>
    children.map((child) => ({
      session_id: sessionId,
      church_id: churchId,
      child_name: childFullName(child),
      parent_name: parentName,
      parent_phone: normalizedPhone,
      room_id: findRoomForChild(child, activeRooms, today),
      security_code: securityCode,
      is_new_visitor: false,
      allergies: child.allergies ?? [],
      allergy_other: clean(child.allergyOther) || null,
      authorized_pickups: clean(child.authorizedPickups) || null,
      medical_notes: clean(child.medicalNotes) || null,
      qr_token: crypto.randomUUID(),
    })),
  );

  const { data: records, error: checkinError } = await admin
    .from('cm_checkin_records')
    .insert(checkinRows)
    .select('id, child_name, room_id, security_code, session_id, qr_token');

  if (checkinError) {
    return Response.json({ error: checkinError.message }, { status: 400 });
  }

  const safeRecords = records ?? [];
  const firstSessionRecords = safeRecords.slice(0, children.length);

  const childLabels: ImmediateLabel[] = firstSessionRecords.map((record, i) => {
    const child = children[i];

    return {
      labelType: 'child',
      childName: record.child_name,
      parentName,
      parentPhone: normalizedPhone,
      roomName: roomNameFor(record.room_id),
      securityCode: record.security_code,
      allergies: allergyLine(child?.allergies, child?.allergyOther),
      medicalNotes: clean(child?.medicalNotes) || null,
      specialInstructions: clean(child?.specialInstructions) || null,
      visitNumber: null,
      qrToken: (record as { qr_token?: string | null }).qr_token ?? null,
    };
  });

  const parentLabel: ImmediateLabel = {
    labelType: 'parent',
    childName: firstSessionRecords
      .map((r) => {
        const rn = roomNameFor(r.room_id);
        return rn ? `${r.child_name} (${rn})` : r.child_name;
      })
      .join(', '),
    parentName,
    parentPhone: normalizedPhone,
    roomName: null,
    securityCode,
    allergies: null,
    medicalNotes: null,
    specialInstructions: null,
    visitNumber: null,
    qrToken: null,
  };

  const labels: ImmediateLabel[] = [...childLabels, parentLabel];

  try {
    const firstRecord = safeRecords[0];

    const childJobs = firstSessionRecords.map((record, i) => {
      const child = children[i];

      return {
        church_id: churchId,
        session_id: record.session_id,
        checkin_record_id: record.id,
        child_name: record.child_name,
        parent_name: parentName,
        parent_phone: normalizedPhone,
        room_id: record.room_id ?? null,
        security_code: record.security_code,
        allergies: allergyLine(child?.allergies, child?.allergyOther),
        medical_notes: clean(child?.medicalNotes) || null,
        special_instructions: clean(child?.specialInstructions) || null,
        label_type: 'child',
        status: 'pending',
        qr_token: (record as { qr_token?: string | null }).qr_token ?? null,
      };
    });

    const parentJob = firstRecord
      ? {
          church_id: churchId,
          session_id: firstRecord.session_id,
          checkin_record_id: firstRecord.id,
          child_name: firstSessionRecords
            .map((r) => {
              const rn = roomNameFor(r.room_id);
              return rn ? `${r.child_name} (${rn})` : r.child_name;
            })
            .join(', '),
          parent_name: parentName,
          parent_phone: normalizedPhone,
          room_id: null,
          security_code: securityCode,
          allergies: null,
          medical_notes: null,
          special_instructions: null,
          label_type: 'parent',
          status: 'pending',
        }
      : null;

    const printJobs = parentJob ? [...childJobs, parentJob] : childJobs;

    await admin.from('cm_label_print_jobs').insert(printJobs);
  } catch (err) {
    console.error('Label print job creation failed:', errorDetails(err));
  }

  try {
    const { data: existingFamily, error: existingFamilyError } = await admin
      .from('cm_visitor_families')
      .select('id')
      .eq('church_id', churchId)
      .eq('parent1_phone', normalizedPhone)
      .maybeSingle();

    if (existingFamilyError) throw existingFamilyError;

    let familyId: string;

    if (!existingFamily) {
      const { data: newFamily, error: familyInsertError } = await admin
        .from('cm_visitor_families')
        .insert({
          church_id: churchId,
          parent1_first_name: clean(parentFirstName),
          parent1_last_name: clean(parentLastName),
          parent1_phone: normalizedPhone,
          parent1_email: clean(parentEmail) || null,
          visit_date: today,
          follow_up_sent: false,
          next_day_sent: false,
          status: 'new',
        })
        .select('id')
        .single();

      if (familyInsertError) throw familyInsertError;
      if (!newFamily) throw new Error('Failed to insert visitor family');

      familyId = (newFamily as { id: string }).id;

      const { error: childrenInsertError } = await admin
        .from('cm_visitor_children')
        .insert(
          children.map((child) => ({
            church_id: churchId,
            family_id: familyId,
            first_name: childFirstName(child),
            last_name: childLastName(child),
            date_of_birth: childBirthDate(child),
            allergies: allergyProfileValue(child),
            medical_notes: clean(child.medicalNotes) || null,
            special_instructions: clean(child.specialInstructions) || null,
          })),
        );

      if (childrenInsertError) throw childrenInsertError;
    } else {
      familyId = (existingFamily as { id: string }).id;

      const { error: familyUpdateError } = await admin
        .from('cm_visitor_families')
        .update({
          visit_date: today,
          parent1_first_name: clean(parentFirstName),
          parent1_last_name: clean(parentLastName),
          parent1_email: clean(parentEmail) || null,
          status: 'returning',
        })
        .eq('id', familyId);

      if (familyUpdateError) throw familyUpdateError;

      const { data: existingChildren, error: existingChildrenError } =
        await admin
          .from('cm_visitor_children')
          .select('id, first_name, last_name')
          .eq('family_id', familyId);

      if (existingChildrenError) throw existingChildrenError;

      const existingRows = (existingChildren ?? []) as {
        id: string;
        first_name: string;
        last_name: string;
      }[];

      const existingIdSet = new Set(existingRows.map((c) => c.id));

      const existingNameMap = new Map(
        existingRows.map((c) => [
          `${clean(c.first_name)}|${clean(c.last_name)}`.toLowerCase(),
          c.id,
        ]),
      );

      for (const child of children) {
        const firstName = childFirstName(child);
        const lastName = childLastName(child);
        const nameKey = `${firstName}|${lastName}`.toLowerCase();

        const matchedChildId =
          child.childId && existingIdSet.has(child.childId)
            ? child.childId
            : existingNameMap.get(nameKey);

        const childPayload = {
          date_of_birth: childBirthDate(child),
          allergies: allergyProfileValue(child),
          medical_notes: clean(child.medicalNotes) || null,
          special_instructions: clean(child.specialInstructions) || null,
        };

        if (matchedChildId) {
          const { error: childUpdateError } = await admin
            .from('cm_visitor_children')
            .update(childPayload)
            .eq('id', matchedChildId);

          if (childUpdateError) throw childUpdateError;
        } else {
          const { error: childInsertError } = await admin
            .from('cm_visitor_children')
            .insert({
              church_id: churchId,
              family_id: familyId,
              first_name: firstName,
              last_name: lastName,
              ...childPayload,
            });

          if (childInsertError) throw childInsertError;
        }
      }
    }
  } catch (err) {
    const details = errorDetails(err);
    console.error('Visitor tracking update failed:', details);

    return Response.json(
      {
        error: 'Check-in saved, but visitor profile update failed',
        details,
      },
      { status: 500 },
    );
  }

  return Response.json({
    success: true,
    securityCode,
    checkedIntoCount: sessionIds.length * children.length,
    labels,
  });
}
