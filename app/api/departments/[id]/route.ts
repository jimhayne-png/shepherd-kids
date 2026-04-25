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
    .from('departments')
    .select('id, name, description, color, icon')
    .eq('id', id)
    .eq('church_id', churchId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ department: data });
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
  const { name, description, color, icon } = await request.json();

  if (!name?.trim()) {
    return Response.json({ error: 'Department name is required' }, { status: 400 });
  }

  const { error } = await adminClient()
    .from('departments')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#1A4A2E',
      icon: icon || null,
    })
    .eq('id', id)
    .eq('church_id', churchId);

  if (error) {
    console.log('Department update error:', error);
    return Response.json({ error: error.message }, { status: 400 });
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

  // Remove all member assignments first
  await supabase.from('member_departments').delete().eq('department_id', id);

  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id)
    .eq('church_id', churchId);

  if (error) {
    console.log('Department delete error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}
