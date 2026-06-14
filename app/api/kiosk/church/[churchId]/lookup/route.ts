import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

type VisitorChildRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  allergies: string | null;   // stored as JSON string via JSON.stringify(string[])
  medical_notes: string | null;
  special_instructions: string | null;
  // allergy_other and authorized_pickups do NOT exist in cm_visitor_children —
  // allergy_other detail is already baked into the allergies JSON array.
};

function parseAllergies(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

type CheckinRecordRow = {
  parent_name: string | null;
  parent_phone: string | null;
  child_name: string;
  // date_of_birth does NOT exist in cm_checkin_records in production (migration not applied).
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const phone = req.nextUrl.searchParams.get('phone');

  if (!phone) {
    return Response.json({ error: 'phone required' }, { status: 400 });
  }

  const normalizedPhone = phone.replace(/\D/g, '');
  const debug = req.nextUrl.searchParams.get('debug') === '1';
  const admin = adminClient();

  console.log('[lookup]', { churchId, phoneDigits: normalizedPhone.slice(-4) + '****' });

  // Prefer visitor family records — they carry child IDs for permanent profile updates.
  const { data: family, error: familyError } = await admin
    .from('cm_visitor_families')
    .select('id, parent1_first_name, parent1_last_name, parent1_phone')
    .eq('church_id', churchId)
    .eq('parent1_phone', normalizedPhone)
    .maybeSingle();

  if (familyError) {
    console.error('[lookup] cm_visitor_families query error:', familyError.message);
  }

  console.log('[lookup] family found:', !!family, 'familyError:', familyError?.message ?? null);

  if (family) {
    const f = family as {
      id: string;
      parent1_first_name: string;
      parent1_last_name: string;
      parent1_phone: string;
    };

    // Only select columns that exist in cm_visitor_children in production.
    // allergy_other is NOT a column — it's baked into the allergies JSON array.
    // authorized_pickups is NOT a column — it lives in cm_checkin_records.
    const { data: visitorChildren, error: childrenError } = await admin
      .from('cm_visitor_children')
      .select('id, first_name, last_name, date_of_birth, allergies, medical_notes, special_instructions')
      .eq('family_id', f.id)
      .order('created_at', { ascending: true });

    if (childrenError) {
      console.error('[lookup] cm_visitor_children query error:', childrenError.message);
    }

    console.log('[lookup] children count:', visitorChildren?.length ?? 0, 'childrenError:', childrenError?.message ?? null);

    if (visitorChildren?.length) {
      const responseChildren = (visitorChildren as VisitorChildRow[]).map((c) => ({
        id: c.id,
        childId: c.id,
        name: `${c.first_name} ${c.last_name}`.trim(),
        firstName: c.first_name,
        lastName: c.last_name,
        dateOfBirth: c.date_of_birth ?? null,
        allergies: parseAllergies(c.allergies),
        allergyOther: "",  // detail already expanded in allergies array
        medicalNotes: c.medical_notes ?? "",
        specialInstructions: c.special_instructions ?? "",
        authorizedPickups: "",  // not stored in cm_visitor_children
      }));

      return Response.json({
        found: true,
        parentFirstName: f.parent1_first_name,
        parentLastName: f.parent1_last_name,
        parentPhone: f.parent1_phone,
        children: responseChildren,
        ...(debug ? { _debug: { source: 'cm_visitor_families', familyId: f.id, childCount: responseChildren.length } } : {}),
      });
    }
  }

  // Fall back to check-in records for families pre-dating visitor tracking.
  // date_of_birth does NOT exist in cm_checkin_records in production (migration not applied).
  const { data: records, error: recordsError } = await admin
    .from('cm_checkin_records')
    .select('parent_name, parent_phone, child_name')
    .eq('church_id', churchId)
    .eq('parent_phone', normalizedPhone)
    .order('checked_in_at', { ascending: false })
    .limit(20);

  if (recordsError) {
    console.error('[lookup] cm_checkin_records query error:', recordsError.message);
  }

  console.log('[lookup] checkin records count:', records?.length ?? 0, 'recordsError:', recordsError?.message ?? null);

  if (!records?.length) {
    return Response.json({
      found: false,
      ...(debug ? { _debug: { familyError: familyError?.message, recordsError: recordsError?.message, phoneDigits: normalizedPhone } } : {}),
    });
  }

  const checkinRecords = records as CheckinRecordRow[];
  const first = checkinRecords[0];
  const parts = (first.parent_name ?? '').trim().split(/\s+/);
  const parentFirstName = parts[0] ?? '';
  const parentLastName = parts.slice(1).join(' ');

  const seen = new Set<string>();
  const children: {
    name: string;
    firstName: string;
    lastName: string;
    dateOfBirth: null;
  }[] = [];

  for (const r of checkinRecords) {
    if (seen.has(r.child_name)) continue;
    seen.add(r.child_name);
    const childParts = (r.child_name ?? '').trim().split(/\s+/);
    children.push({
      name: r.child_name,
      firstName: childParts[0] ?? '',
      lastName: childParts.slice(1).join(' '),
      dateOfBirth: null,
    });
  }

  return Response.json({
    found: true,
    parentFirstName,
    parentLastName,
    parentPhone: first.parent_phone,
    children,
    ...(debug ? { _debug: { source: 'cm_checkin_records', childCount: children.length } } : {}),
  });
}