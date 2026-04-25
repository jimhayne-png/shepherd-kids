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
    .from('departments')
    .select(`
      id, name, description, color, icon, created_at,
      member_departments(count)
    `)
    .eq('church_id', churchId)
    .order('name', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ departments: data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { name, description, color, icon } = await request.json();

  if (!name?.trim()) {
    return Response.json({ error: 'Department name is required' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('departments')
    .insert({
      church_id: churchId,
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#1A4A2E',
      icon: icon || null,
    })
    .select('id')
    .single();

  if (error) {
    console.log('Department insert error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true, department_id: data.id });
}
