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

async function getChurchUser(userId: string) {
  const { data } = await adminClient()
    .from('church_users')
    .select('church_id, role')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const { departmentId } = await params;
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cu = await getChurchUser(user.id);
  if (!cu || cu.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { frequency } = body;

  if (!['monthly', 'bimonthly'].includes(frequency)) {
    return Response.json({ error: 'Invalid frequency' }, { status: 400 });
  }

  // Get church_id from department
  const { data: dept } = await adminClient()
    .from('departments')
    .select('church_id')
    .eq('id', departmentId)
    .eq('church_id', cu.church_id)
    .single();

  if (!dept) return Response.json({ error: 'Department not found' }, { status: 404 });

  const { error } = await adminClient()
    .from('shepherd_settings')
    .upsert({
      department_id: departmentId,
      church_id: cu.church_id,
      frequency,
    }, { onConflict: 'department_id' });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
