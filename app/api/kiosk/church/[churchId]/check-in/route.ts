import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

type ChildInput = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  roomId?: string;
  allergies?: string[];
  allergyOther?: string;
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

function allergyLine(allergies: string[] | undefined, allergyOther: string | undefined): string | null {
  if (!allergies?.length) return null;
  return allergies
    .map((a) => (a === 'Other' && allergyOther?.trim() ? `Other: ${allergyOther.trim()}` : a))
    .join(', ');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const body = await req.json();
  const { parentFirstName, parentLastName, parentPhone, parentEmail, sessionIds, children } = body as {
    parentFirstName: string;
    parentLastName: string;
    parentPhone: string;
    parentEmail?: string;
    sessionIds: string[];
    children: ChildInput[];
  };

  if (!parentFirstName || !parentLastName || !parentPhone || !sessionIds?.length || !children?.length) {
    return Response.json(
      { error: 'parentFirstName, parentLastName, parentPhone, sessionIds, and children are required' },
      { status: 400 },
    );
  }

  const admin = adminClient();
  const { data: churchRow } = await admin.from('churches').select('timezone').eq('id', churchId).maybeSingle();
  const tz = (churchRow as { timezone?: string } | null)?.timezone ?? 'America/Los_Angeles';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

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

  const validIds = new Set(((validSessions ?? []) as { id: string }[]).map((s) => s.id));
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

  // One record per child per session
  const inserts = sessionIds.flatMap((sessionId) =>
    children.map((child) => ({
      session_id: sessionId,
      church_id: churchId,
      child_name: `${child.firstName.trim()} ${child.lastName.trim()}`.trim(),
      parent_name: parentName,
      parent_phone: normalizedPhone,
      room_id: child.roomId ?? null,
      security_code: securityCode,
      is_new_visitor: false,
      allergies: child.allergies ?? [],
      allergy_other: child.allergyOther || null,
      authorized_pickups: child.authorizedPickups || null,
      date_of_birth: child.dateOfBirth ?? null,
      special_instructions: child.specialInstructions || null,
    })),
  );

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .insert(inserts)
    .select('id, child_name, room_id, security_code, session_id');
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const safeRecords = records ?? [];

  // One label per child (first session only — all sessions share same security code / room)
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
      medicalNotes: null,
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

  // Create backup print jobs — status stays 'pending'; only Print Station marks them printed
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
        medical_notes: null,
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
  } catch {
    // non-blocking
  }

  // Visitor tracking — populate cm_visitor_families / cm_visitor_children for ministry follow-up
  try {
    const { data: existingFamily } = await admin
      .from('cm_visitor_families')
      .select('id, visit_count')
      .eq('church_id', churchId)
      .eq('parent1_phone', normalizedPhone)
      .maybeSingle();

    let familyId: string;

    if (!existingFamily) {
      const { data: newFamily } = await admin
        .from('cm_visitor_families')
        .insert({
          church_id: churchId,
          parent1_first_name: parentFirstName.trim(),
          parent1_last_name: parentLastName.trim(),
          parent1_phone: normalizedPhone,
          parent1_email: parentEmail?.trim() || null,
          visit_count: 1,
          first_visit_date: today,
          last_visit_date: today,
          status: 'active',
        })
        .select('id')
        .single();

      if (!newFamily) throw new Error('Failed to insert family');
      familyId = (newFamily as { id: string }).id;

      await admin.from('cm_visitor_children').insert(
        children.map((child) => ({
          church_id: churchId,
          family_id: familyId,
          first_name: child.firstName.trim(),
          last_name: child.lastName.trim(),
          date_of_birth: child.dateOfBirth ?? null,
        })),
      );
    } else {
      familyId = (existingFamily as { id: string; visit_count: number }).id;
      const currentCount = (existingFamily as { id: string; visit_count: number }).visit_count ?? 0;

      await admin
        .from('cm_visitor_families')
        .update({ last_visit_date: today, visit_count: currentCount + 1 })
        .eq('id', familyId);

      const { data: existingChildren } = await admin
        .from('cm_visitor_children')
        .select('first_name, last_name')
        .eq('family_id', familyId);

      const existingNameSet = new Set(
        ((existingChildren ?? []) as { first_name: string; last_name: string }[]).map(
          (c) => `${c.first_name}|${c.last_name}`.toLowerCase(),
        ),
      );

      const newChildren = children.filter(
        (child) =>
          !existingNameSet.has(`${child.firstName.trim()}|${child.lastName.trim()}`.toLowerCase()),
      );

      if (newChildren.length > 0) {
        await admin.from('cm_visitor_children').insert(
          newChildren.map((child) => ({
            church_id: churchId,
            family_id: familyId,
            first_name: child.firstName.trim(),
            last_name: child.lastName.trim(),
            date_of_birth: child.dateOfBirth ?? null,
          })),
        );
      }
    }
  } catch {
    // non-blocking — visitor tracking failure must not fail the check-in
  }

  return Response.json({
    success: true,
    securityCode,
    checkedIntoCount: sessionIds.length * children.length,
    labels,
  });
}
