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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient()
    .from('members')
    .select(`
      id, first_name, last_name, email, phone,
      address, city, state, zip,
      birthdate, anniversary, spiritual_birthday, gender,
      member_type, status, notes, photo_url,
      created_at,
      member_departments(department_id, departments(id, name))
    `)
    .eq('church_id', churchId)
    .order('last_name', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ members: data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const {
    firstName, lastName, email, phone,
    address, city, state, zip,
    birthdate, anniversary, spiritualBirthday,
    memberType, status, notes,
    departmentIds,
  } = body;

  if (!firstName?.trim() || !lastName?.trim()) {
    return Response.json({ error: 'First and last name are required' }, { status: 400 });
  }

  const supabase = adminClient();

  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({
      church_id: churchId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zip: zip?.trim() || null,
      birthdate: birthdate || null,
      anniversary: anniversary || null,
      spiritual_birthday: spiritualBirthday || null,
      member_type: memberType || 'member',
      status: status || 'active',
      notes: notes?.trim() || null,
    })
    .select('id')
    .single();

  if (memberError) {
    console.log('Member insert error:', memberError);
    return Response.json({ error: memberError.message }, { status: 400 });
  }

  if (departmentIds?.length) {
    const rows = departmentIds.map((dId: string) => ({
      member_id: member.id,
      department_id: dId,
    }));
    const { error: deptError } = await supabase.from('member_departments').insert(rows);
    if (deptError) console.log('Dept assignment error:', deptError);
  }

  return Response.json({ success: true, member_id: member.id });
}
