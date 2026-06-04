import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

type ChildInput = {
  childName: string;
  childId?: string;
  childFirstName?: string;
  childLastName?: string;
  childDateOfBirth?: string;
  roomId?: string;
  isNew?: boolean;
  allergies?: string[];
  allergyOther?: string;
  medicalNotes?: string;
  specialInstructions?: string;
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

function serializeAllergies(allergies: string[], allergyOther: string): string | null {
  if (!allergies.length) return null;

  const arr = allergies.map((a) =>
    a === 'Other' && allergyOther.trim() ? `Other: ${allergyOther.trim()}` : a,
  );

  return JSON.stringify(arr);
}

function allergyLine(allergies: string[] | undefined, allergyOther: string | undefined): string | null {
  if (!allergies?.length) return null;

  return allergies
    .map((a) =>
      a === 'Other' && allergyOther?.trim()
        ? `Other: ${allergyOther.trim()}`
        : a,
    )
    .join(', ');
}

function calcAge(dob: string): number {
  const d = new Date(dob + 'T00:00:00');
  const today = new Date();

  let age = today.getFullYear() - d.getFullYear();

  if (
    today.getMonth() < d.getMonth() ||
    (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
  ) {
    age--;
  }

  return age;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionToken: string }> },
) {
  const { sessionToken } = await params;
  const body = await req.json();

  const {
    parentName,
    parentPhone,
    parentEmail,
    familyId,
    isNewFamily,
    children,
  } = body as {
    parentName: string;
    parentPhone: string;
    parentEmail?: string;
    familyId?: string;
    isNewFamily?: boolean;
    children: ChildInput[];
  };

  if (!parentName || !parentPhone || !children?.length) {
    return Response.json(
      { error: 'parentName, parentPhone, and children are required' },
      { status: 400 },
    );
  }

  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, church_id, status')
    .eq('id', sessionToken)
    .maybeSingle();

  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.status !== 'open') {
    return Response.json({ error: 'Session is closed' }, { status: 400 });
  }

  const normalizedPhone = parentPhone.replace(/\D/g, '');
  const normalizedEmail = parentEmail ? parentEmail.trim().toLowerCase() : null;
  const securityCode = String(Math.floor(100000 + Math.random() * 900000));

  const { data: activeRooms } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, min_age, max_age')
    .eq('church_id', session.church_id)
    .eq('is_active', true)
    .order('min_age');

  function resolveRoom(dob: string | undefined, explicit: string | undefined): string | null {
    if (explicit) return explicit;
    if (!dob) return null;

    const age = calcAge(dob);

    for (const r of activeRooms ?? []) {
      const ok =
        (r.min_age == null || age >= r.min_age) &&
        (r.max_age == null || age <= r.max_age);

      if (ok) return r.id;
    }

    return null;
  }

  function roomNameFor(roomId: string | null | undefined): string | null {
    if (!roomId) return null;
    return activeRooms?.find((r) => r.id === roomId)?.name ?? null;
  }

  let resolvedFamilyId: string | null = familyId ?? null;
    if (!resolvedFamilyId) {
    const { data: existing } = await admin
      .from('cm_visitor_families')
      .select('id')
      .eq('church_id', session.church_id)
      .eq('parent1_phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      resolvedFamilyId = existing.id;
    } else {
      const parts = parentName.trim().split(/\s+/);
      const firstName = parts[0] ?? '';
      const lastName = parts.slice(1).join(' ');

      const { data: created, error: familyError } = await admin
        .from('cm_visitor_families')
        .insert({
          church_id: session.church_id,
          parent1_first_name: firstName,
          parent1_last_name: lastName,
          parent1_phone: normalizedPhone,
          parent1_email: normalizedEmail,
          visit_date: new Date().toISOString().slice(0, 10),
          status: 'new',
          follow_up_sent: false,
          next_day_sent: false,
        })
        .select('id')
        .single();

      if (familyError) console.error('[check-in] family insert error:', familyError.message);
      resolvedFamilyId = created?.id ?? null;
    }
  } else if (normalizedEmail) {
    const { data: currentFamily } = await admin
      .from('cm_visitor_families')
      .select('parent1_email')
      .eq('id', resolvedFamilyId)
      .maybeSingle();

    if (currentFamily && currentFamily.parent1_email !== normalizedEmail) {
      await admin
        .from('cm_visitor_families')
        .update({ parent1_email: normalizedEmail })
        .eq('id', resolvedFamilyId);
    }
  }

  if (resolvedFamilyId) {
    for (const child of children) {
      const nameParts = child.childName.trim().split(/\s+/);
      const firstName = child.childFirstName?.trim() || nameParts[0] || '';
      const lastName = child.childLastName?.trim() || nameParts.slice(1).join(' ') || '';

      // Locate existing child profile by explicit ID or by name within the family
      let existingId: string | null = null;
      let existingDob: string | null = null;

      if (child.childId) {
        const { data: cur } = await admin
          .from('cm_visitor_children')
          .select('id, date_of_birth')
          .eq('id', child.childId)
          .maybeSingle();
        existingId = cur?.id ?? null;
        existingDob = (cur as { id: string; date_of_birth: string | null } | null)?.date_of_birth ?? null;
      } else if (firstName) {
        const { data: found } = await admin
          .from('cm_visitor_children')
          .select('id, date_of_birth')
          .eq('family_id', resolvedFamilyId)
          .eq('first_name', firstName)
          .eq('last_name', lastName)
          .maybeSingle();
        existingId = found?.id ?? null;
        existingDob = (found as { id: string; date_of_birth: string | null } | null)?.date_of_birth ?? null;
      }

      const profileData: Record<string, unknown> = {
        allergies: serializeAllergies(child.allergies ?? [], child.allergyOther ?? ''),
        medical_notes: child.medicalNotes ?? null,
        special_instructions: child.specialInstructions ?? null,
      };
      // Only write DOB if not already stored
      if (child.childDateOfBirth && !existingDob) {
        profileData.date_of_birth = child.childDateOfBirth;
      }

      if (existingId) {
        const { error: updateError } = await admin
          .from('cm_visitor_children')
          .update(profileData)
          .eq('id', existingId);
        if (updateError) console.error('[check-in] child update error:', updateError.message);
      } else if (firstName) {
        const { error: insertError } = await admin
          .from('cm_visitor_children')
          .insert({
            church_id: session.church_id,
            family_id: resolvedFamilyId,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: child.childDateOfBirth ?? null,
            ...profileData,
          });
        if (insertError) console.error('[check-in] child insert error:', insertError.message);
      }
    }
  }

  const inserts = children.map((child) => ({
    session_id: session.id,
    church_id: session.church_id,
    child_name: child.childName,
    parent_name: parentName,
    parent_phone: normalizedPhone,
    room_id: resolveRoom(child.childDateOfBirth, child.roomId),
    security_code: securityCode,
    is_new_visitor: !!isNewFamily,
    allergies: child.allergies ?? [],
    allergy_other: child.allergyOther ?? null,
    date_of_birth: child.childDateOfBirth ?? null,
  }));

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .insert(inserts)
    .select('id, child_name, room_id, security_code');

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const safeRecords = records ?? [];
    const childImmediateLabels: ImmediateLabel[] = safeRecords.map((record, i) => {
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

  const parentImmediateLabel: ImmediateLabel | null = safeRecords[0]
    ? {
        labelType: 'parent',
        childName: safeRecords
          .map((r) => {
            const roomName = roomNameFor(r.room_id);
            return roomName ? `${r.child_name} (${roomName})` : r.child_name;
          })
          .join(', '),
        parentName,
        parentPhone: normalizedPhone,
        roomName: roomNameFor(safeRecords[0]?.room_id),
        securityCode,
        allergies: null,
        medicalNotes: null,
        specialInstructions: null,
        visitNumber: null,
      }
    : null;

  const immediateLabels: ImmediateLabel[] = parentImmediateLabel
    ? [...childImmediateLabels, parentImmediateLabel]
    : childImmediateLabels;

  let printJobsCreated = 0;
  let printJobWarning: string | undefined;

  try {
    const childJobs = safeRecords.map((record, i) => {
      const child = children[i];

      return {
        church_id: session.church_id,
        session_id: session.id,
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

    const firstRecord = safeRecords[0];

    const parentJob = firstRecord
      ? {
          church_id: session.church_id,
          session_id: session.id,
          checkin_record_id: firstRecord.id,
          child_name: safeRecords
            .map((r) => {
              const roomName = roomNameFor(r.room_id);
              return roomName ? `${r.child_name} (${roomName})` : r.child_name;
            })
            .join(', '),
          parent_name: parentName,
          parent_phone: normalizedPhone,
          room_id: firstRecord.room_id ?? null,
          security_code: securityCode,
          allergies: null,
          medical_notes: null,
          special_instructions: null,
          label_type: 'parent',
          status: 'pending',
        }
      : null;

    const printJobs = parentJob ? [...childJobs, parentJob] : childJobs;

    const { error: printError } = await admin
      .from('cm_label_print_jobs')
      .insert(printJobs);

    if (printError) {
      printJobWarning = printError.message;
    } else {
      printJobsCreated = printJobs.length;
    }
  } catch {
    printJobWarning = 'Label jobs could not be queued';
  }

  return Response.json({
    securityCode,
    records: safeRecords,
    labels: immediateLabels,
    printJobsCreated,
    ...(printJobWarning ? { printJobWarning } : {}),
  });
}