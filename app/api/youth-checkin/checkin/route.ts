import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, phone, firstName, lastName, grade, dateOfBirth, address, city, state, zip } = body;

  if (!sessionId || !phone) {
    return Response.json({ error: 'sessionId and phone are required' }, { status: 400 });
  }

  const admin = adminClient();

  // Validate session
  const { data: session } = await admin
    .from('youth_checkin_sessions')
    .select('id, church_id, ministry_type, name, status')
    .eq('id', sessionId)
    .eq('status', 'open')
    .maybeSingle();

  if (!session) {
    return Response.json({ error: 'Session not found or closed' }, { status: 404 });
  }

  const churchId = session.church_id;

  // Look up student by phone
  const { data: existingStudent } = await admin
    .from('youth_students')
    .select('id, first_name, last_name')
    .eq('church_id', churchId)
    .eq('phone', phone)
    .maybeSingle();

  // If lookup only (no firstName provided), return found/not-found
  if (!firstName) {
    if (existingStudent) {
      // Check in returning student
      await admin.from('youth_checkin_records').insert({
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

  // New student registration
  let studentId: string;
  let isNewVisitor = true;

  if (existingStudent) {
    studentId = existingStudent.id;
    isNewVisitor = false;
  } else {
    const { data: newStudent, error: insertErr } = await admin
      .from('youth_students')
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

  // Insert check-in record
  await admin.from('youth_checkin_records').insert({
    session_id: sessionId,
    church_id: churchId,
    student_id: studentId,
    is_new_visitor: isNewVisitor,
    checked_in_at: new Date().toISOString(),
  });

  // New visitor: upsert ministry_visitors and ministry_rosters
  if (isNewVisitor) {
    await admin.from('ministry_visitors').upsert({
      church_id: churchId,
      ministry_type: session.ministry_type,
      visitor_name: `${firstName} ${lastName}`,
      visitor_phone: phone,
      visit_date: new Date().toISOString().slice(0, 10),
    }, { onConflict: 'church_id,ministry_type,visitor_phone' });

    await admin.from('ministry_rosters').upsert({
      church_id: churchId,
      ministry_type: session.ministry_type,
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
