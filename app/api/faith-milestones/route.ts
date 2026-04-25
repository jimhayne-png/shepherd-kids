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

  const memberId = request.nextUrl.searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  const [recordsRes, customRes] = await Promise.all([
    adminClient()
      .from('faith_milestones')
      .select('id, milestone_type, is_completed, completed_at, notes, is_private')
      .eq('church_id', churchId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: true }),
    adminClient()
      .from('custom_milestones')
      .select('id, name, icon, sort_order')
      .eq('church_id', churchId)
      .order('sort_order', { ascending: true }),
  ]);

  if (recordsRes.error) return Response.json({ error: recordsRes.error.message }, { status: 400 });

  return Response.json({
    records: recordsRes.data ?? [],
    customMilestones: customRes.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { memberId, milestoneType, isCompleted, completedAt, notes, isPrivate } = body;

  if (!memberId || !milestoneType) {
    return Response.json({ error: 'memberId and milestoneType are required' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('faith_milestones')
    .insert({
      church_id: churchId,
      member_id: memberId,
      milestone_type: milestoneType,
      is_completed: isCompleted ?? false,
      completed_at: completedAt || null,
      notes: notes?.trim() || null,
      is_private: isPrivate ?? false,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, id: data.id });
}
