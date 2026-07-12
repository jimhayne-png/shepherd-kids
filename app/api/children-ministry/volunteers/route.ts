import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { hashPin } from '@/lib/crypto/pin';

const VOLUNTEER_FIELDS = [
  'id', 'church_id', 'member_id', 'first_name', 'last_name',
  'email', 'phone', 'roles', 'is_active', 'background_check_status',
  'background_check_date', 'notes', 'reliability_score', 'created_at',
  'updated_at', 'approved', 'approved_at', 'approved_by',
].join(', ');

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  const { data: rows, error } = await admin
    .from('cm_volunteers')
    .select(`${VOLUNTEER_FIELDS}, pin_hash`)
    .eq('church_id', churchId)
    .order('last_name')
    .order('first_name');

  if (error) return Response.json({ error: error.message }, { status: 400 });

  type VolRow = { id: string; pin_hash?: string | null; [k: string]: unknown };
  const typedRows = (rows ?? []) as unknown as VolRow[];
  const volIds = typedRows.map(v => v.id);

  type ClassroomAssRow = { volunteer_id: string; room_id: string };
  type SessionRow = {
    volunteer_id: string; room_id: string;
    issued_at: string; expires_at: string; revoked_at: string | null;
  };

  let caTyped: ClassroomAssRow[] = [];
  let sessionTyped: SessionRow[] = [];

  if (volIds.length) {
    const [caRes, sessRes] = await Promise.all([
      admin.from('cm_volunteer_classroom_assignments')
        .select('volunteer_id, room_id')
        .in('volunteer_id', volIds)
        .eq('active', true),
      admin.from('cm_volunteer_sessions')
        .select('volunteer_id, room_id, issued_at, expires_at, revoked_at')
        .in('volunteer_id', volIds)
        .order('issued_at', { ascending: false }),
    ]);
    caTyped = (caRes.data ?? []) as unknown as ClassroomAssRow[];
    sessionTyped = (sessRes.data ?? []) as unknown as SessionRow[];
  }

  const allRoomIds = [...new Set([...caTyped.map(a => a.room_id), ...sessionTyped.map(s => s.room_id)])];
  const { data: roomRows } = allRoomIds.length
    ? await admin.from('cm_checkin_rooms').select('id, name').in('id', allRoomIds)
    : { data: [] };
  type RoomRow = { id: string; name: string };
  const roomNameMap = new Map((roomRows ?? []).map(r => [(r as RoomRow).id, (r as RoomRow).name]));

  const classroomMap: Record<string, { id: string; name: string }[]> = {};
  for (const a of caTyped) {
    if (!classroomMap[a.volunteer_id]) classroomMap[a.volunteer_id] = [];
    classroomMap[a.volunteer_id].push({ id: a.room_id, name: roomNameMap.get(a.room_id) ?? 'Unknown' });
  }

  const now = new Date();
  const latestSession: Record<string, { issued_at: string; is_signed_in: boolean; current_room_name: string | null }> = {};
  for (const s of sessionTyped) {
    if (latestSession[s.volunteer_id]) continue;
    const isActive = !s.revoked_at && new Date(s.expires_at) > now;
    latestSession[s.volunteer_id] = {
      issued_at: s.issued_at,
      is_signed_in: isActive,
      current_room_name: isActive ? (roomNameMap.get(s.room_id) ?? null) : null,
    };
  }

  const volunteers = typedRows.map(v => {
    const { pin_hash, ...rest } = v;
    const sess = latestSession[v.id] ?? null;
    return {
      ...rest,
      has_pin: !!pin_hash,
      classrooms: classroomMap[v.id] ?? [],
      last_issued_at: sess?.issued_at ?? null,
      is_signed_in: sess?.is_signed_in ?? false,
      current_room_name: sess?.current_room_name ?? null,
    };
  });

  return Response.json({ volunteers });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await req.json();
  const {
    first_name, last_name, email, phone,
    background_check_status, background_check_date, notes, approved, pin,
    is_active, classroom_ids,
  } = body;

  if (!first_name?.trim() || !last_name?.trim()) {
    return Response.json({ error: 'First and last name required' }, { status: 400 });
  }

  const pin_hash = pin ? await hashPin(String(pin).trim()) : null;

  const { data: inserted, error } = await adminClient().from('cm_volunteers').insert({
    church_id: churchId,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    roles: [],
    is_active: is_active !== false,
    background_check_status: background_check_status || 'not_recorded',
    background_check_date: background_check_date || null,
    notes: notes?.trim() || null,
    approved: !!approved,
    approved_at: approved ? new Date().toISOString() : null,
    approved_by: approved ? userId : null,
    pin_hash,
  }).select(VOLUNTEER_FIELDS).single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const insertedRec = inserted as unknown as Record<string, unknown>;

  if (Array.isArray(classroom_ids) && classroom_ids.length && insertedRec?.id) {
    await adminClient().from('cm_volunteer_classroom_assignments').insert(
      (classroom_ids as string[]).map(roomId => ({
        church_id: churchId,
        volunteer_id: insertedRec.id,
        room_id: roomId,
        active: true,
      }))
    );
  }

  return Response.json({ volunteer: { ...insertedRec, has_pin: !!pin_hash } });
}
