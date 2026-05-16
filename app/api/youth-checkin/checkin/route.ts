import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function getMinistryTables(ministryType: string) {
  if (ministryType === 'middle-school') return {
    sessions: 'middle_school_checkin_sessions',
    records: 'middle_school_checkin_records',
    students: 'middle_school_students',
  };
  if (ministryType === 'high-school') return {
    sessions: 'high_school_checkin_sessions',
    records: 'high_school_checkin_records',
    students: 'high_school_students',
  };
  return {
    sessions: 'youth_checkin_sessions',
    records: 'youth_checkin_records',
    students: 'youth_students',
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, phone, firstName, lastName, grade, dateOfBirth, address, city, state, zip } = body;

  if (!sessionId || !phone) {
    return Response.json({ error: 'sessionId and phone are required' }, { status: 400 });
  }

  const admin = adminClient();

  // Try to find session in all tables (MS first, then HS, then legacy)
  let session: any = null;
  let resolvedMinistryType = 'youth';
  for (const [table, mt] of [
    ['middle_school_checkin_sessions', 'middle-school'],
    ['high_school_checkin_sessions', 'high-school'],
    ['youth_checkin_sessions', 'youth'],
  ] as const) {
    const { data } = await admin.from(table).select('id, church_id, ministry_type, name, status').eq('id', sessionId).maybeSingle();
    if (data) {
      session = data;
      resolvedMinistryType = mt !== 'youth' ? mt : (data.ministry_type ?? 'youth');
      break;
    }
  }

  if (!session || session.status !== 'open') {
    return Response.json({ error: 'Session not found or closed' }, { status: 404 });
  }

  const churchId = session.church_id;
  const tables = getMinistryTables(resolvedMinistryType);

  // Look up student by phone in correct table
  const { data: existingStudent } = await admin
    .from(tables.students)
    .select('id, first_name, last_name')
    .eq('church_id', churchId)
    .eq('phone', phone)
    .maybeSingle();

  // Lookup only (no firstName) → check in returning student or return not found
  if (!firstName) {
    if (existingStudent) {
      await admin.from(tables.records).insert({
        session_id: sessionId,
        church_id: churchId,
        student_id: existingStudent.id,
        is_new_visitor: false,
        checked_in_at: new Date().toISOString(),
      });
      return Response.json({
        success: true,
        studentName: `${existingStudent.first_name} ${existingStudent.last_name}`,
        isNewVisitor: false,
      });
    }
    return Response.json({ found: false });
  }

  // New student
  let studentId: string;
  let isNewVisitor = true;

  if (existingStudent) {
    studentId = existingStudent.id;
    isNewVisitor = false;
  } else {
    const { data: newStudent, error: insertErr } = await admin
      .from(tables.students)
      .insert({
        church_id: churchId,
        first_name: firstName,
        last_name: lastName,
        phone,
        grade: grade ?? null,
        date_of_birth: dateOfBirth || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
      })
      .select('id')
      .single();

    if (insertErr || !newStudent) {
      return Response.json({ error: 'Failed to create student' }, { status: 500 });
    }
    studentId = newStudent.id;
  }

  await admin.from(tables.records).insert({
    session_id: sessionId,
    church_id: churchId,
    student_id: studentId,
    is_new_visitor: isNewVisitor,
    checked_in_at: new Date().toISOString(),
  });

  if (isNewVisitor) {
    await admin.from('ministry_visitors').upsert({
      church_id: churchId,
      ministry_type: resolvedMinistryType,
      visitor_name: `${firstName} ${lastName}`,
      visitor_phone: phone,
      visit_date: new Date().toISOString().slice(0, 10),
    }, { onConflict: 'church_id,ministry_type,visitor_phone' });

    await admin.from('ministry_rosters').upsert({
      church_id: churchId,
      ministry_type: resolvedMinistryType,
      member_id: studentId,
      pipeline_stage: 'visitor',
    }, { onConflict: 'church_id,ministry_type,member_id' });
  }

  return Response.json({
    success: true,
    studentName: `${firstName} ${lastName}`,
    isNewVisitor,
  });
}
