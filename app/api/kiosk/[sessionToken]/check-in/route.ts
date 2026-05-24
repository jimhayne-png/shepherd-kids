import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

type ChildInput = {
  childName: string;        // combined display name → cm_checkin_records.child_name
  childId?: string;         // existing cm_visitor_children.id (pre-existing child)
  childFirstName?: string;  // required when isNew = true
  childLastName?: string;   // required when isNew = true
  childAge?: number;        // used for room auto-assignment
  roomId?: string;          // explicit room override
  isNew?: boolean;          // true → create new cm_visitor_children record
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionToken: string }> },
) {
  const { sessionToken } = await params;
  const body = await req.json();
  const {
    parentName,
    parentPhone,
    familyId,
    isNewFamily,
    children,
  } = body as {
    parentName: string;
    parentPhone: string;
    familyId?: string;
    isNewFamily?: boolean;
    children: ChildInput[];
  };

  if (!parentName || !parentPhone || !children?.length) {
    return Response.json(
      { error: 'parentName, parentPhone, and children are required' },
      { status: 400 },
    );
  }

  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, church_id, status')
    .eq('id', sessionToken)
    .maybeSingle();

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'open') return Response.json({ error: 'Session is closed' }, { status: 400 });

  const normalizedPhone = parentPhone.replace(/\D/g, '');
  const securityCode = String(Math.floor(100000 + Math.random() * 900000));

  // Load active rooms once for age-based assignment
  const { data: activeRooms } = await admin
    .from('cm_checkin_rooms')
    .select('id, min_age, max_age')
    .eq('church_id', session.church_id)
    .eq('is_active', true)
    .order('min_age');

  function resolveRoom(age: number | undefined, explicit: string | undefined): string | null {
    if (explicit) return explicit;
    if (age == null) return null;
    for (const r of activeRooms ?? []) {
      const ok = (r.min_age == null || age >= r.min_age) && (r.max_age == null || age <= r.max_age);
      if (ok) return r.id;
    }
    return null;
  }

  // ── Resolve or create visitor family ──────────────────────────────────────
  let resolvedFamilyId: string | null = familyId ?? null;

  if (!resolvedFamilyId) {
    // Check for existing family first (idempotent)
    const { data: existing } = await admin
      .from('cm_visitor_families')
      .select('id')
      .eq('church_id', session.church_id)
      .eq('parent1_phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      resolvedFamilyId = existing.id;
    } else {
      const parts = parentName.trim().split(/\s+/);
      const firstName = parts[0] ?? '';
      const lastName = parts.slice(1).join(' ');

      const { data: created } = await admin
        .from('cm_visitor_families')
        .insert({
          church_id: session.church_id,
          parent1_first_name: firstName,
          parent1_last_name: lastName,
          parent1_phone: normalizedPhone,
          visit_date: new Date().toISOString().slice(0, 10),
          status: 'new',
          follow_up_sent: false,
          next_day_sent: false,
        })
        .select('id')
        .single();

      resolvedFamilyId = created?.id ?? null;
    }
  }

  // ── Create cm_visitor_children for any new children ───────────────────────
  if (resolvedFamilyId) {
    for (const child of children) {
      if (!child.isNew || !child.childFirstName || !child.childLastName) continue;

      const { data: existing } = await admin
        .from('cm_visitor_children')
        .select('id')
        .eq('family_id', resolvedFamilyId)
        .eq('first_name', child.childFirstName)
        .eq('last_name', child.childLastName)
        .maybeSingle();

      if (!existing) {
        await admin.from('cm_visitor_children').insert({
          church_id: session.church_id,
          family_id: resolvedFamilyId,
          first_name: child.childFirstName,
          last_name: child.childLastName,
        });
      }
    }
  }

  // ── Insert cm_checkin_records (one per child, shared security code) ───────
  const inserts = children.map(child => ({
    session_id: session.id,
    church_id: session.church_id,
    child_name: child.childName,
    parent_name: parentName,
    parent_phone: normalizedPhone,
    room_id: resolveRoom(child.childAge, child.roomId),
    security_code: securityCode,
    is_new_visitor: !!isNewFamily,
    allergies: [],
  }));

  const { data: records, error } = await admin
    .from('cm_checkin_records')
    .insert(inserts)
    .select('id, child_name, room_id, security_code');

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ securityCode, records: records ?? [] });
}
