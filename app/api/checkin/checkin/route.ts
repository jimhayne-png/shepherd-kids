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
  const { sessionId, parentName, parentPhone, isReturning, children } = body as {
    sessionId: string;
    parentName: string;
    parentPhone: string;
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

  const inserts: object[] = [];
  const resultMeta: { childName: string; roomId: string | null; roomName: string | null; allergies: string[]; allergyOther: string | null }[] = [];

  for (const child of children) {
    let childName: string;
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
      const age = nc.dateOfBirth ? calcAge(nc.dateOfBirth) : null;
      const assigned = assignRoom(age);
      roomId = assigned?.id ?? null;
      roomName = assigned?.name ?? null;
      allergies = nc.allergies ?? [];
      allergyOther = nc.allergyOther ?? null;
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

    resultMeta.push({ childName, roomId, roomName, allergies, allergyOther });
  }

  const { data: created, error } = await admin
    .from('cm_checkin_records')
    .insert(inserts)
    .select('id');

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const records = (created ?? []).map((r, i) => ({
    id: r.id,
    childName: resultMeta[i].childName,
    roomId: resultMeta[i].roomId,
    roomName: resultMeta[i].roomName,
    securityCode,
    isNewVisitor,
    allergies: resultMeta[i].allergies,
    allergyOther: resultMeta[i].allergyOther,
  }));

  return Response.json({ records, securityCode, isNewVisitor });
}
