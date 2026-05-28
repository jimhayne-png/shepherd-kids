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
  const today = new Date().toISOString().slice(0, 10);

  const { data: validSessions } = await admin
    .from('cm_checkin_sessions')
    .select('id')
    .eq('church_id', churchId)
    .eq('date', today)
    .eq('status', 'open')
    .in('id', sessionIds);

  const validIds = new Set(((validSessions ?? []) as { id: string }[]).map((s) => s.id));
  const invalidIds = sessionIds.filter((id) => !validIds.has(id));
  if (invalidIds.length) {
    return Response.json(
      { error: 'One or more sessions are not valid for this church today' },
      { status: 400 },
    );
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

  // Create label print jobs (non-blocking — check-in succeeds regardless)
  try {
    const safeRecords = records ?? [];
    const firstRecord = safeRecords[0];

    // Map child index by session — records are in flatMap order: [child0/sess0, child1/sess0, ..., child0/sess1, ...]
    const childJobs = safeRecords.map((record, i) => {
      const childIdx = i % children.length;
      const child = children[childIdx];
      const allergyLine =
        child.allergies?.length
          ? child.allergies
              .map((a) => (a === 'Other' && child.allergyOther?.trim() ? `Other: ${child.allergyOther.trim()}` : a))
              .join(', ')
          : null;
      return {
        church_id: churchId,
        session_id: record.session_id,
        checkin_record_id: record.id,
        child_name: record.child_name,
        parent_name: parentName,
        parent_phone: normalizedPhone,
        room_id: record.room_id ?? null,
        security_code: record.security_code,
        allergies: allergyLine,
        medical_notes: null,
        special_instructions: child.specialInstructions || null,
        label_type: 'child',
        status: 'pending',
      };
    });

    const parentJob = firstRecord
      ? {
          church_id: churchId,
          session_id: firstRecord.session_id,
          checkin_record_id: firstRecord.id,
          child_name: children.map((c) => `${c.firstName.trim()} ${c.lastName.trim()}`.trim()).join(', '),
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

  return Response.json({ success: true, securityCode, checkedIntoCount: sessionIds.length * children.length });
}
