import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    slug,
    firstName,
    lastName,
    email,
    phone,
    birthMonth,
    birthDay,
    birthYear,
    heardFrom,
  } = body;

  if (!slug) return Response.json({ error: 'Missing slug' }, { status: 400 });
  if (!firstName?.trim() || !lastName?.trim()) {
    return Response.json({ error: 'First and last name are required' }, { status: 400 });
  }
  if (!email?.trim()) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!birthMonth || !birthDay) {
    return Response.json({ error: 'Birth month and day are required' }, { status: 400 });
  }

  const supabase = adminClient();

  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle();

  if (churchError || !church) {
    return Response.json({ error: 'Church not found' }, { status: 404 });
  }

  const year = birthYear ? String(birthYear).padStart(4, '0') : '1900';
  const month = String(birthMonth).padStart(2, '0');
  const day = String(birthDay).padStart(2, '0');
  const birthdate = `${year}-${month}-${day}`;

  const notes = heardFrom
    ? `Self-registered via QR code. Heard from: ${heardFrom}`
    : 'Self-registered via QR code.';

  const { error: insertError } = await supabase
    .from('members')
    .insert({
      church_id: church.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      birthdate,
      member_type: 'visitor',
      status: 'active',
      notes,
    });

  if (insertError) {
    console.log('Join insert error:', insertError);
    return Response.json({ error: insertError.message }, { status: 400 });
  }

  return Response.json({ success: true, church_name: church.name });
}
