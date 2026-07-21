import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const { data: parents, error } = await admin
    .from('cm_visitor_families')
    .select('*')
    .eq('church_id', auth.churchId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ parents: parents ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { churchId } = auth;

  const body = await request.json().catch(() => ({}));
  const {
    parent1_first_name, parent1_last_name,
    parent1_phone, parent1_email,
    parent2_first_name, parent2_last_name,
    parent2_phone, parent2_email,
    address, city, state, zip,
    emergency_contact_name, emergency_contact_phone,
    preferred_language,
    force,
  } = body as Record<string, string | boolean | undefined>;

  const firstName = (parent1_first_name as string | undefined)?.trim() ?? '';
  const lastName  = (parent1_last_name  as string | undefined)?.trim() ?? '';
  const phone     = (parent1_phone      as string | undefined)?.trim() ?? '';
  const email     = (parent1_email      as string | undefined)?.trim().toLowerCase() ?? '';

  if (!firstName || !lastName) {
    return Response.json({ error: 'First name and last name are required.' }, { status: 400 });
  }
  if (!phone && !email) {
    return Response.json({ error: 'A phone number or email address is required.' }, { status: 400 });
  }

  const admin = adminClient();

  // Duplicate check — same church + matching email, phone, or name.
  if (!force) {
    const orParts: string[] = [];
    if (email)                          orParts.push(`parent1_email.ilike.${email}`);
    if (phone.replace(/\D/g, '').length >= 7) orParts.push(`parent1_phone.ilike.%${phone.replace(/\D/g, '').slice(-7)}%`);
    orParts.push(`and(parent1_first_name.ilike.${firstName},parent1_last_name.ilike.${lastName})`);

    const { data: dupes } = await admin
      .from('cm_visitor_families')
      .select('id, parent1_first_name, parent1_last_name, parent1_phone, parent1_email, status')
      .eq('church_id', churchId)
      .or(orParts.join(','));

    if (dupes && dupes.length > 0) {
      return Response.json({ duplicates: dupes }, { status: 409 });
    }
  }

  const { data: family, error } = await admin
    .from('cm_visitor_families')
    .insert({
      church_id: churchId,
      parent1_first_name: firstName,
      parent1_last_name: lastName,
      parent1_phone: phone || null,
      parent1_email: email || null,
      parent2_first_name: (parent2_first_name as string | undefined)?.trim() || null,
      parent2_last_name:  (parent2_last_name  as string | undefined)?.trim() || null,
      parent2_phone:      (parent2_phone      as string | undefined)?.trim() || null,
      parent2_email:      (parent2_email      as string | undefined)?.trim().toLowerCase() || null,
      address:                   (address                   as string | undefined)?.trim() || null,
      city:                      (city                      as string | undefined)?.trim() || null,
      state:                     (state                     as string | undefined)?.trim() || null,
      zip:                       (zip                       as string | undefined)?.trim() || null,
      emergency_contact_name:    (emergency_contact_name    as string | undefined)?.trim() || null,
      emergency_contact_phone:   (emergency_contact_phone   as string | undefined)?.trim() || null,
      preferred_language:        (preferred_language        as string | undefined)?.trim() || null,
      status: 'new',
      visit_date: new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ family }, { status: 201 });
}
