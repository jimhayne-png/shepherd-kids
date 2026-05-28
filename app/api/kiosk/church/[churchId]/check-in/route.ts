import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const body = await req.json();
  const { parentName, parentPhone, childName, childDob, roomId, sessionIds } = body as {
    parentName: string;
    parentPhone: string;
    childName: string;
    childDob?: string;
    roomId?: string;
    sessionIds: string[];
  };

  if (!parentName || !parentPhone || !childName || !sessionIds?.length) {
    return Response.json(
      { error: 'parentName, parentPhone, childName, and sessionIds are required' },
      { status: 400 },
    );
  }

  const admin = adminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Validate all sessionIds belong to this church and are open today
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
  const securityCode = String(Math.floor(100000 + Math.random() * 900000));

  const inserts = sessionIds.map((sessionId) => ({
    session_id: sessionId,
    church_id: churchId,
    child_name: childName,
    parent_name: parentName,
    parent_phone: normalizedPhone,
    room_id: roomId ?? null,
    security_code: securityCode,
    is_new_visitor: false,
    allergies: [],
    date_of_birth: childDob ?? null,
  }));

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .insert(inserts)
    .select('id, child_name, room_id, security_code, session_id');
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Create label print jobs (non-blocking — check-in succeeds regardless)
  try {
    const safeRecords = records ?? [];
    const firstRecord = safeRecords[0];

    const childJobs = safeRecords.map((record) => ({
      church_id: churchId,
      session_id: record.session_id,
      checkin_record_id: record.id,
      child_name: record.child_name,
      parent_name: parentName,
      parent_phone: normalizedPhone,
      room_id: record.room_id ?? null,
      security_code: record.security_code,
      allergies: null,
      medical_notes: null,
      special_instructions: null,
      label_type: 'child',
      status: 'pending',
    }));

    const parentJob = firstRecord
      ? {
          church_id: churchId,
          session_id: firstRecord.session_id,
          checkin_record_id: firstRecord.id,
          child_name: childName,
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

  return Response.json({ success: true, securityCode, checkedIntoCount: sessionIds.length });
}
