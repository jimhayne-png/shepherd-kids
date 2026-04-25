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

  const [settingsRes, staffRes] = await Promise.all([
    adminClient()
      .from('visitation_settings')
      .select('connection_threshold_days, weekly_digest')
      .eq('church_id', churchId)
      .maybeSingle(),

    adminClient()
      .from('visitation_staff')
      .select('id, member_id, role, members(first_name, last_name, email)')
      .eq('church_id', churchId)
      .order('created_at'),
  ]);

  return Response.json({
    settings: settingsRes.data ?? { connection_threshold_days: 30, weekly_digest: false },
    staff: staffRes.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { action, connectionThresholdDays, weeklyDigest, memberId, role, staffId } = body;

  if (action === 'add_staff') {
    if (!memberId || !role) return Response.json({ error: 'memberId and role required' }, { status: 400 });
    const { error } = await adminClient()
      .from('visitation_staff')
      .insert({ church_id: churchId, member_id: memberId, role });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true });
  }

  if (action === 'remove_staff') {
    if (!staffId) return Response.json({ error: 'staffId required' }, { status: 400 });
    const { error } = await adminClient()
      .from('visitation_staff')
      .delete()
      .eq('id', staffId)
      .eq('church_id', churchId);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true });
  }

  // Default: update settings
  const { error } = await adminClient()
    .from('visitation_settings')
    .upsert(
      {
        church_id: churchId,
        connection_threshold_days: connectionThresholdDays ?? 30,
        weekly_digest: weeklyDigest ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'church_id' }
    );

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
