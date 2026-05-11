import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function calcAge(dob: string): number {
  const d = new Date(dob + 'T00:00:00');
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age;
}

function randPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

type NewChild = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  allergies?: string[];
  allergyOther?: string;
};

type ReturningChild = {
  childName: string;
  roomId?: string;
  allergies?: string[];
  allergyOther?: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, parentName, parentPhone, parentEmail, isReturning, children } = body as {
    sessionId: string;
    parentName: string;
    parentPhone: string;
    parentEmail?: string;
    isReturning?: boolean;
    children: (NewChild | ReturningChild)[];
  };

  if (!sessionId || !parentName || !parentPhone || !children?.length) {
    return Response.json({ error: 'sessionId, parentName, parentPhone, and children required' }, { status: 400 });
  }

  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, church_id, status')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'open') return Response.json({ error: 'Session is closed' }, { status: 400 });

  const normalizedPhone = parentPhone.replace(/\D/g, '');

  // Check if new visitor (any prior record with this exact phone in this church)
  const { count } = await admin
    .from('cm_checkin_records')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', session.church_id)
    .eq('parent_phone', normalizedPhone);

  const isNewVisitor = (count ?? 0) === 0;

  // Shared security code for the whole family group
  const securityCode = randPin();

  // Load active rooms for age-based assignment
  const { data: activeRooms } = await admin
    .from('cm_checkin_rooms')
    .select('id, name, min_age, max_age')
    .eq('church_id', session.church_id)
    .eq('is_active', true)
    .order('min_age');

  const rooms = activeRooms ?? [];

  function assignRoom(age: number | null): { id: string; name: string } | null {
    if (age === null) return null;
    for (const r of rooms) {
      const ok =
        (r.min_age === null || age >= r.min_age) &&
        (r.max_age === null || age <= r.max_age);
      if (ok) return { id: r.id, name: r.name };
    }
    return null;
  }

  const roomNameMap: Record<string, string> = {};
  for (const r of rooms) roomNameMap[r.id] = r.name;

  // Fetch existing records for this session + phone to detect duplicates
  const { data: existingRecords } = await admin
    .from('cm_checkin_records')
    .select('child_name')
    .eq('session_id', sessionId)
    .eq('parent_phone', normalizedPhone);

  const existingChildNames = new Set((existingRecords ?? []).map((r) => r.child_name));
  const duplicates: string[] = [];

  const inserts: object[] = [];
  const resultMeta: { childName: string; dateOfBirth: string | null; roomId: string | null; roomName: string | null; allergies: string[]; allergyOther: string | null }[] = [];

  for (const child of children) {
    let childName: string;
    let dateOfBirth: string | null = null;
    let roomId: string | null = null;
    let roomName: string | null = null;
    let allergies: string[] = [];
    let allergyOther: string | null = null;

    if (isReturning) {
      const rc = child as ReturningChild;
      childName = rc.childName;
      roomId = rc.roomId ?? null;
      roomName = roomId ? (roomNameMap[roomId] ?? 'Unknown Room') : null;
      allergies = rc.allergies ?? [];
      allergyOther = rc.allergyOther ?? null;
    } else {
      const nc = child as NewChild;
      childName = `${nc.firstName} ${nc.lastName}`.trim();
      dateOfBirth = nc.dateOfBirth ?? null;
      const age = nc.dateOfBirth ? calcAge(nc.dateOfBirth) : null;
      const assigned = assignRoom(age);
      console.log('[checkin] room assignment:', { childName, dob: nc.dateOfBirth ?? null, age, room: assigned ?? null });
      roomId = assigned?.id ?? null;
      roomName = assigned?.name ?? null;
      allergies = nc.allergies ?? [];
      allergyOther = nc.allergyOther ?? null;
    }

    if (existingChildNames.has(childName)) {
      duplicates.push(childName);
      continue;
    }

    inserts.push({
      session_id: sessionId,
      church_id: session.church_id,
      child_name: childName,
      parent_name: parentName,
      parent_phone: normalizedPhone,
      room_id: roomId,
      security_code: securityCode,
      is_new_visitor: isNewVisitor,
      allergies,
      allergy_other: allergyOther ?? null,
    });

    resultMeta.push({ childName, dateOfBirth, roomId, roomName, allergies, allergyOther });
  }

  let records: object[] = [];

  if (inserts.length > 0) {
    const { data: created, error } = await admin
      .from('cm_checkin_records')
      .insert(inserts)
      .select('id');

    if (error) return Response.json({ error: error.message }, { status: 400 });

    records = (created ?? []).map((r, i) => ({
      id: r.id,
      childName: resultMeta[i].childName,
      roomId: resultMeta[i].roomId,
      roomName: resultMeta[i].roomName,
      securityCode,
      isNewVisitor,
      allergies: resultMeta[i].allergies,
      allergyOther: resultMeta[i].allergyOther,
    }));
  }

  // For new visitor families, sync into the visitor roster
  if (isNewVisitor && resultMeta.length > 0) {
    const splitName = (full: string) => {
      const parts = full.trim().split(/\s+/);
      return parts.length === 1
        ? { firstName: parts[0], lastName: '' }
        : { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    };

    // Upsert family: find by (church_id, parent1_phone); on conflict do nothing, return existing id
    const { data: existingFamilies } = await admin
      .from('cm_visitor_families')
      .select('id')
      .eq('church_id', session.church_id)
      .eq('parent1_phone', normalizedPhone)
      .limit(1);

    let familyId: string | null = null;

    if (existingFamilies && existingFamilies.length > 0) {
      familyId = existingFamilies[0].id;
    } else {
      const { firstName: p1First, lastName: p1Last } = splitName(parentName);
      const { data: newFamily } = await admin
        .from('cm_visitor_families')
        .insert({
          church_id: session.church_id,
          parent1_first_name: p1First,
          parent1_last_name: p1Last,
          parent1_phone: normalizedPhone,
          parent1_email: parentEmail ?? null,
          visit_date: new Date().toISOString().slice(0, 10),
          status: 'new',
          follow_up_sent: false,
          next_day_sent: false,
        })
        .select('id')
        .single();
      if (newFamily) familyId = newFamily.id;
    }

    if (familyId) {
      // Fetch first names already in the roster for this family
      const { data: existingVisitorChildren } = await admin
        .from('cm_visitor_children')
        .select('first_name')
        .eq('family_id', familyId);

      const existingFirstNames = new Set(
        (existingVisitorChildren ?? []).map(c => c.first_name.toLowerCase().trim())
      );

      const childInserts = resultMeta
        .map(r => {
          const { firstName, lastName } = splitName(r.childName);
          return { firstName, lastName, dateOfBirth: r.dateOfBirth };
        })
        .filter(c => !existingFirstNames.has(c.firstName.toLowerCase().trim()))
        .map(c => ({
          church_id: session.church_id,
          family_id: familyId as string,
          first_name: c.firstName,
          last_name: c.lastName,
          date_of_birth: c.dateOfBirth ?? null,
          grade: null,
        }));

      if (childInserts.length > 0) {
        await admin.from('cm_visitor_children').insert(childInserts);
      }
    }

    // Upsert parent into ministry_visitors so they appear in the Roster
    const today = new Date().toISOString().slice(0, 10);
    const { firstName: mvFirst, lastName: mvLast } = splitName(parentName);

    const { data: existingMv } = await admin
      .from('ministry_visitors')
      .select('id, visit_count')
      .eq('church_id', session.church_id)
      .eq('ministry_type', 'childrens')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existingMv) {
      await admin
        .from('ministry_visitors')
        .update({ visit_count: (existingMv.visit_count ?? 1) + 1, last_visit_date: today })
        .eq('id', existingMv.id);
    } else {
      await admin
        .from('ministry_visitors')
        .insert({
          church_id: session.church_id,
          ministry_type: 'childrens',
          first_name: mvFirst,
          last_name: mvLast,
          phone: normalizedPhone,
          email: parentEmail ?? null,
          visit_count: 1,
          first_visit_date: today,
          last_visit_date: today,
          promoted_to_member: false,
          status: 'new',
        });
    }
  }

  return Response.json({ records, securityCode, isNewVisitor, duplicates });
}
