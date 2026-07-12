import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { hashPin } from '@/lib/crypto/pin';

// Fields returned to the dashboard — pin_hash is never included.
const VOLUNTEER_FIELDS = [
  'id', 'church_id', 'member_id', 'first_name', 'last_name',
  'email', 'phone', 'roles', 'is_active', 'background_check_status',
  'background_check_date', 'notes', 'reliability_score', 'created_at',
  'updated_at', 'approved', 'approved_at', 'approved_by',
  // pin_hash intentionally omitted; expose only whether one is set
].join(', ');

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = ctx;

  const admin = adminClient();

  // Fetch volunteers excluding pin_hash; also flag whether a hash is configured.
  const { data: rows, error } = await admin
    .from('cm_volunteers')
    .select(`${VOLUNTEER_FIELDS}, pin_hash`)
    .eq('church_id', churchId)
    .order('last_name')
    .order('first_name');

  if (error) return Response.json({ error: error.message }, { status: 400 });

  type VolRow = { id: string; pin_hash?: string | null; [k: string]: unknown };
  const typedRows = (rows ?? []) as unknown as VolRow[];

  const since = new Date(); since.setDate(since.getDate() - 90);
  const volIds = typedRows.map(v => v.id);
  const { data: assignments } = volIds.length
    ? await admin.from('cm_volunteer_assignments').select('volunteer_id, created_at').in('volunteer_id', volIds).gte('created_at', since.toISOString())
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const a of assignments ?? []) countMap[(a as { volunteer_id: string }).volunteer_id] = (countMap[(a as { volunteer_id: string }).volunteer_id] ?? 0) + 1;

  const volunteers = typedRows.map(v => {
    const { pin_hash, ...rest } = v;
    return { ...rest, assignment_count: countMap[v.id] ?? 0, has_pin: !!pin_hash };
  });

  return Response.json({ volunteers });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, churchId } = ctx;

  const body = await req.json();
  const {
    member_id, first_name, last_name, email, phone, roles,
    background_check_status, background_check_date, notes, approved, pin,
  } = body;

  if (!first_name?.trim() || !last_name?.trim()) {
    return Response.json({ error: 'First and last name required' }, { status: 400 });
  }

  const pin_hash = pin ? await hashPin(String(pin).trim()) : null;

  const { data: inserted, error } = await adminClient().from('cm_volunteers').insert({
    church_id: churchId,
    member_id: member_id || null,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    roles: Array.isArray(roles) ? roles : [],
    background_check_status: background_check_status || 'pending',
    background_check_date: background_check_date || null,
    notes: notes?.trim() || null,
    approved: !!approved,
    approved_at: approved ? new Date().toISOString() : null,
    approved_by: approved ? userId : null,
    pin_hash,
  }).select(VOLUNTEER_FIELDS).single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ volunteer: { ...(inserted as unknown as Record<string, unknown>), has_pin: !!pin_hash } });
}
