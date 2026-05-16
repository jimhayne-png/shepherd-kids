import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, phone, firstName, lastName, grade, dateOfBirth, address, city, state, zip } = body;

  if (!sessionId || !phone) {
    return NextResponse.json({ error: 'sessionId and phone are required' }, { status: 400 });
  }

  // Validate session is open
  const { data: session, error: sessionErr } = await adminClient()
    .from('middle_school_checkin_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('status', 'open')
    .maybeSingle();

  if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'Session not found or not open' }, { status: 404 });

  const churchId = session.church_id;

  // Look up student by phone
  const { data: existingStudent, error: studentErr } = await adminClient()
    .from('middle_school_students')
    .select('*')
    .eq('church_id', churchId)
    .eq('phone', phone)
    .maybeSingle();

  if (studentErr) return NextResponse.json({ error: studentErr.message }, { status: 500 });

  // Lookup mode (no firstName provided)
  if (!firstName) {
    if (existingStudent) {
      const { error: checkinErr } = await adminClient()
        .from('middle_school_checkin_records')
        .insert({
          session_id: sessionId,
          church_id: churchId,
          student_id: existingStudent.id,
          is_new_visitor: false,
          checked_in_at: new Date().toISOString(),
        });
      if (checkinErr) return NextResponse.json({ error: checkinErr.message }, { status: 500 });
      return NextResponse.json({
        success: true,
        studentName: `${existingStudent.first_name} ${existingStudent.last_name}`,
        isNewVisitor: false,
      });
    } else {
      return NextResponse.json({ found: false });
    }
  }

  // New student registration mode
  let studentId: string;
  let isNewVisitor: boolean;

  if (existingStudent) {
    studentId = existingStudent.id;
    isNewVisitor = false;
  } else {
    const { data: newStudent, error: insertErr } = await adminClient()
      .from('middle_school_students')
      .insert({
        church_id: churchId,
        first_name: firstName,
        last_name: lastName,
        phone,
        grade: grade ?? null,
        date_of_birth: dateOfBirth ?? null,
        address: address ?? null,
        city: city ?? null,
        state: state ?? null,
        zip: zip ?? null,
      })
      .select()
      .single();

    if (insertErr || !newStudent) return NextResponse.json({ error: insertErr?.message ?? 'Failed to create student' }, { status: 500 });
    studentId = newStudent.id;
    isNewVisitor = true;
  }

  const { error: checkinErr } = await adminClient()
    .from('middle_school_checkin_records')
    .insert({
      session_id: sessionId,
      church_id: churchId,
      student_id: studentId,
      is_new_visitor: isNewVisitor,
      checked_in_at: new Date().toISOString(),
    });

  if (checkinErr) return NextResponse.json({ error: checkinErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    studentName: `${firstName} ${lastName}`,
    isNewVisitor,
  });
}
