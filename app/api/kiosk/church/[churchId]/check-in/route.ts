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
};

function childFirstName(child: ChildInput): string {
  if (child.firstName?.trim()) return child.firstName.trim();
  if (child.childFirstName?.trim()) return child.childFirstName.trim();
  if (child.childName?.trim()) return child.childName.trim().split(/\s+/)[0] ?? '';
  return '';
}

function childLastName(child: ChildInput): string {
  if (child.lastName?.trim()) return child.lastName.trim();
  if (child.childLastName?.trim()) return child.childLastName.trim();
  if (child.childName?.trim()) return child.childName.trim().split(/\s+/).slice(1).join(' ');
  return '';
}

function childFullName(child: ChildInput): string {
  return `${childFirstName(child)} ${childLastName(child)}`.trim();
}

function childBirthDate(child: ChildInput): string | null {
  return child.dateOfBirth || child.childDateOfBirth || null;
}

function allergyArray(child: ChildInput): string[] {
  const allergies = child.allergies ?? [];
  return allergies.map((a) =>
    a === 'Other' && child.allergyOther?.trim()
      ? `Other: ${child.allergyOther.trim()}`
      : a,
  );
}

function allergyLine(
  allergies: string[] | undefined,
  allergyOther: string | undefined,
): string | null {
  if (!allergies?.length) return null;

  return allergies
    .map((a) =>
      a === 'Other' && allergyOther?.trim()
        ? `Other: ${allergyOther.trim()}`
        : a,
    )
    .join(', ');
}

function allergyProfileValue(child: ChildInput): string {
  return JSON.stringify(allergyArray(child));
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
    !parentFirstName ||
    !parentLastName ||
    !parentPhone ||
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

  const [{ data: validSessions }, { data: activeRooms }] = await Promise.all([
    admin
      .from('cm_checkin_sessions')
      .select('id')
      .eq('church_id', churchId)
      .eq('date', today)
      .eq('status', 'open')
      .in('id', sessionIds),
    admin
      .from('cm_checkin_rooms')
      .select('id, name')
      .eq('church_id', churchId)
      .eq('is_active', true),
  ]);

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
    return (activeRooms ?? []).find((r) => r.id === roomId)?.name ?? null;
  }

  const normalizedPhone = parentPhone.replace(/\D/g, '');
  const parentName = `${parentFirstName.trim()} ${parentLastName.trim()}`.trim();
  const securityCode = String(Math.floor(100000 + Math.random() * 900000));

  const inserts = sessionIds.flatMap((sessionId) =>
    children.map((child) => ({
      session_id: sessionId,
      church_id: churchId,
      child_name: childFullName(child),
      parent_name: parentName,
      parent_phone: normalizedPhone,
      room_id: child.roomId ?? null,
      security_code: securityCode,
      is_new_visitor: false,
      allergies: child.allergies ?? [],
      allergy_other: child.allergyOther || null,
      authorized_pickups: child.authorizedPickups || null,
      date_of_birth: childBirthDate(child),
      special_instructions: child.specialInstructions || null,
    })),
  );

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .insert(inserts)
    .select('id, child_name, room_id, security_code, session_id');

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
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
      medicalNotes: child?.medicalNotes || null,
      specialInstructions: child?.specialInstructions || null,
      visitNumber: null,
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
        medical_notes: child?.medicalNotes || null,
        special_instructions: child?.specialInstructions || null,
        label_type: 'child',
        status: 'pending',
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
    console.error('Label print job creation failed:', err);
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
          parent1_first_name: parentFirstName.trim(),
          parent1_last_name: parentLastName.trim(),
          parent1_phone: normalizedPhone,
          parent1_email: parentEmail?.trim() || null,
          first_visit_date: today,
          last_visit_date: today,
          status: 'active',
        })
        .select('id')
        .single();

      if (familyInsertError) throw familyInsertError;
      if (!newFamily) throw new Error('Failed to insert family');

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
            medical_notes: child.medicalNotes || null,
            special_instructions: child.specialInstructions || null,
          })),
        );

      if (childrenInsertError) throw childrenInsertError;
    } else {
      familyId = (existingFamily as { id: string }).id;

      const { error: familyUpdateError } = await admin
        .from('cm_visitor_families')
        .update({
          last_visit_date: today,
          parent1_first_name: parentFirstName.trim(),
          parent1_last_name: parentLastName.trim(),
          parent1_email: parentEmail?.trim() || null,
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
          `${c.first_name}|${c.last_name}`.toLowerCase(),
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
          medical_notes: child.medicalNotes || null,
          special_instructions: child.specialInstructions || null,
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
    console.error('Visitor tracking update failed:', err);
  }

  return Response.json({
    success: true,
    securityCode,
    checkedIntoCount: sessionIds.length * children.length,
    labels,
  });
}