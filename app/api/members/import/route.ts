import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}

async function getChurchId(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.church_id ?? null;
}

type MemberRow = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  birth_year?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  member_type?: string;
  status?: string;
  notes?: string;
};

const VALID_TYPES = new Set(['member', 'visitor', 'staff', 'child', 'youth']);
const VALID_STATUSES = new Set(['active', 'inactive']);

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { rows }: { rows: MemberRow[] } = await request.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'No rows provided' }, { status: 400 });
  }

  const supabase = adminClient();

  // Fetch existing emails for this church to detect duplicates
  const { data: existingMembers } = await supabase
    .from('members')
    .select('email')
    .eq('church_id', churchId)
    .not('email', 'is', null);

  const existingEmails = new Set(
    (existingMembers ?? []).map((m: { email: string }) => m.email?.toLowerCase())
  );

  let imported = 0;
  let skipped = 0;
  const errors: { row: number; name: string; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || `Row ${rowNum}`;

    if (!row.first_name?.trim() || !row.last_name?.trim()) {
      errors.push({ row: rowNum, name, reason: 'Missing first or last name' });
      continue;
    }

    const email = row.email?.trim().toLowerCase() || null;

    if (email && existingEmails.has(email)) {
      skipped++;
      continue;
    }

    // Parse birthdate — support YYYY-MM-DD or MM/DD/YYYY
    let birthdate: string | null = null;
    if (row.birthdate?.trim()) {
      const raw = row.birthdate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        birthdate = raw;
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
        const [m, d, y] = raw.split('/');
        birthdate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // Override year if birth_year column provided
      if (birthdate && row.birth_year?.trim()) {
        birthdate = `${row.birth_year.trim()}-${birthdate.slice(5)}`;
      }
    }

    const memberType = VALID_TYPES.has(row.member_type?.toLowerCase() ?? '')
      ? row.member_type!.toLowerCase()
      : 'member';

    const status = VALID_STATUSES.has(row.status?.toLowerCase() ?? '')
      ? row.status!.toLowerCase()
      : 'active';

    const { error: insertError } = await supabase.from('members').insert({
      church_id: churchId,
      first_name: row.first_name.trim(),
      last_name: row.last_name.trim(),
      email,
      phone: row.phone?.trim() || null,
      birthdate,
      address: row.address?.trim() || null,
      city: row.city?.trim() || null,
      state: row.state?.trim() || null,
      zip: row.zip?.trim() || null,
      member_type: memberType,
      status,
      notes: row.notes?.trim() || null,
    });

    if (insertError) {
      errors.push({ row: rowNum, name, reason: insertError.message });
    } else {
      imported++;
      if (email) existingEmails.add(email);
    }
  }

  return Response.json({ imported, skipped, errors });
}
