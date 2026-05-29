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

function serializeAllergies(allergies: string[], allergyOther: string): string | null {
  if (!allergies.length) return null;
  const arr = allergies.map((a) =>
    a === 'Other' && allergyOther.trim() ? `Other: ${allergyOther.trim()}` : a,
  );
  return JSON.stringify(arr);
}

function calcAge(dob: string): number {
  const d = new Date(dob + 'T00:00:00');
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (
    today.getMonth() < d.getMonth() ||
    (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
  ) age--;
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

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'open') return Response.json({ error: 'Session is closed' }, { status: 400 });

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

      const { data: created } = await admin
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

  for (const child of children) {
    if (child.isNew || !child.childId) continue;

    const updates: Record<string, unknown> = {
      allergies: serializeAllergies(child.allergies ?? [], child.allergyOther ?? ''),
      medical_notes: child.medicalNotes ?? null,
      special_instructions: child.specialInstructions ?? null,
    };

    if (child.childDateOfBirth) {
      const { data: existing } = await admin
        .from('cm_visitor_children')
        .select('date_of_birth')
        .eq('id', child.childId)
        .maybeSingle();

      if (existing && !existing.date_of_birth) {
        updates.date_of_birth = child.childDateOfBirth;
      }
    }

    await admin.from('cm_visitor_children').update(updates).eq('id', child.childId);
  }

  if (resolvedFamilyId) {
    for (const child of children) {
      if (!child.isNew || !child.childFirstName || !child.childLastName) continue;

      const { data: existing } = await admin
        .from('cm_visitor_children')
        .select('id')
        .eq('family_id', resolvedFamilyId)
        .eq('first_name', child.childFirstName)
        .eq('last_name', child.childLastName)
        .maybeSingle();

      if (!existing) {
        await admin.from('cm_visitor_children').insert({
          church_id: session.church_id,
          family_id: resolvedFamilyId,
          first_name: child.childFirstName,
          last_name: child.childLastName,
          date_of_birth: child.childDateOfBirth ?? null,
          allergies: serializeAllergies(child.allergies ?? [], child.allergyOther ?? ''),
          medical_notes: child.medicalNotes ?? null,
          special_instructions: child.specialInstructions ?? null,
        });
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

  if (error) return Response.json({ error: error.message }, { status: 400 });

  let printJobsCreated = 0;
  let printJobWarning: string | undefined;

  try {
    const safeRecords = records ?? [];

    const childJobs = safeRecords.map((record, i) => {
      const child = children[i];
      const allergyLine = child?.allergies?.length
        ? child.allergies
            .map((a) =>
              a === 'Other' && child.allergyOther?.trim()
                ? `Other: ${child.allergyOther.trim()}`
                : a,
            )
            .join(', ')
        : null;

      return {
        church_id: session.church_id,
        session_id: session.id,
        checkin_record_id: record.id,
        child_name: record.child_name,
        parent_name: parentName,
        parent_phone: normalizedPhone,
        room_id: record.room_id ?? null,
        security_code: record.security_code,
        allergies: allergyLine,
        medical_notes: children[i]?.medicalNotes || null,
        special_instructions: children[i]?.specialInstructions || null,
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
              const room = activeRooms?.find((ar) => ar.id === r.room_id);
              return room?.name ? `${r.child_name} (${room.name})` : r.child_name;
            })
            .join(', '),
          parent_name: parentName,
          parent_phone: normalizedPhone,
          room_id: safeRecords[0]?.room_id ?? null,
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
    records: records ?? [],
    printJobsCreated,
    ...(printJobWarning ? { printJobWarning } : {}),
  });
}