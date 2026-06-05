import { type NextRequest } from 'next/server';
import { adminClient } from '@/lib/api-auth';

type VisitorChildRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  allergies: string | null;
  medical_notes: string | null;
  special_instructions: string | null;
};

type CheckinRecordRow = {
  parent_name: string | null;
  parent_phone: string | null;
  child_name: string;
  date_of_birth: string | null;
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
  const admin = adminClient();

  // Prefer visitor family records — they carry child IDs needed for permanent child profile updates.
  const { data: family } = await admin
    .from('cm_visitor_families')
    .select('id, parent1_first_name, parent1_last_name, parent1_phone')
    .eq('church_id', churchId)
    .eq('parent1_phone', normalizedPhone)
    .maybeSingle();

  if (family) {
    const f = family as {
      id: string;
      parent1_first_name: string;
      parent1_last_name: string;
      parent1_phone: string;
    };

    const { data: visitorChildren } = await admin
      .from('cm_visitor_children')
      .select('id, first_name, last_name, date_of_birth, allergies, medical_notes, special_instructions')
      .eq('family_id', f.id)
      .order('created_at', { ascending: true });

    if (visitorChildren?.length) {
      return Response.json({
        found: true,
        parentFirstName: f.parent1_first_name,
        parentLastName: f.parent1_last_name,
        parentPhone: f.parent1_phone,
        children: (visitorChildren as VisitorChildRow[]).map((c) => ({
          id: c.id,
          childId: c.id,
          name: `${c.first_name} ${c.last_name}`.trim(),
          firstName: c.first_name,
          lastName: c.last_name,
          dateOfBirth: c.date_of_birth ?? null,
          allergies: c.allergies,
          medicalNotes: c.medical_notes,
          specialInstructions: c.special_instructions,
        })),
      });
    }
  }

  // Fall back to check-in records for families pre-dating visitor tracking.
  // These records do not have permanent cm_visitor_children IDs, so childId is intentionally omitted.
  const { data: records } = await admin
    .from('cm_checkin_records')
    .select('parent_name, parent_phone, child_name, date_of_birth')
    .eq('church_id', churchId)
    .eq('parent_phone', normalizedPhone)
    .order('checked_in_at', { ascending: false })
    .limit(20);

  if (!records?.length) {
    return Response.json({ found: false });
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
    dateOfBirth: string | null;
  }[] = [];

  for (const r of checkinRecords) {
    if (seen.has(r.child_name)) continue;

    seen.add(r.child_name);

    const childParts = (r.child_name ?? '').trim().split(/\s+/);
    const firstName = childParts[0] ?? '';
    const lastName = childParts.slice(1).join(' ');

    children.push({
      name: r.child_name,
      firstName,
      lastName,
      dateOfBirth: r.date_of_birth ?? null,
    });
  }

  return Response.json({
    found: true,
    parentFirstName,
    parentLastName,
    parentPhone: first.parent_phone,
    children,
  });
}