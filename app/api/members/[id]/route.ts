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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { id } = await params;

  const { data, error } = await adminClient()
    .from('members')
    .select(`
      id, first_name, last_name, email, phone,
      address, city, state, zip,
      birthdate, anniversary, spiritual_birthday, gender,
      member_type, status, notes, portal_token,
      member_departments(department_id)
    `)
    .eq('id', id)
    .eq('church_id', churchId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ member: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const {
    firstName, lastName, email, phone,
    address, city, state, zip,
    birthdate, anniversary, spiritualBirthday, gender,
    memberType, status, notes,
    departmentIds,
  } = body;

  const supabase = adminClient();

  const updates: Record<string, unknown> = {};
  if (firstName !== undefined) updates.first_name = firstName.trim();
  if (lastName !== undefined) updates.last_name = lastName.trim();
  if (email !== undefined) updates.email = email?.trim() || null;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (address !== undefined) updates.address = address?.trim() || null;
  if (city !== undefined) updates.city = city?.trim() || null;
  if (state !== undefined) updates.state = state?.trim() || null;
  if (zip !== undefined) updates.zip = zip?.trim() || null;
  if (birthdate !== undefined) updates.birthdate = birthdate || null;
  if (anniversary !== undefined) updates.anniversary = anniversary || null;
  if (spiritualBirthday !== undefined) updates.spiritual_birthday = spiritualBirthday || null;
  if (gender !== undefined) updates.gender = gender || null;
  if (memberType !== undefined) updates.member_type = memberType;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  const { error: updateError } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .eq('church_id', churchId);

  if (updateError) {
    console.log('Member update error:', updateError);
    return Response.json({ error: updateError.message }, { status: 400 });
  }

  if (departmentIds !== undefined) {
    await supabase.from('member_departments').delete().eq('member_id', id);
    if (departmentIds.length) {
      const rows = departmentIds.map((dId: string) => ({
        member_id: id,
        department_id: dId,
      }));
      await supabase.from('member_departments').insert(rows);
    }
  }

  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { id } = await params;
  const supabase = adminClient();

  await supabase.from('member_departments').delete().eq('member_id', id);

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .eq('church_id', churchId);

  if (error) {
    console.log('Member delete error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}
