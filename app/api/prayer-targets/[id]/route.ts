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

  const { data: current, error: fetchErr } = await adminClient()
    .from('prayer_targets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !current) return Response.json({ error: 'Not found' }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  if (body.markPrayed) {
    const now = new Date();
    const lastPrayed = current.last_prayed_at ? new Date(current.last_prayed_at) : null;
    const msPerDay = 86_400_000;
    const daysDiff = lastPrayed
      ? Math.floor((now.getTime() - lastPrayed.getTime()) / msPerDay)
      : Infinity;

    let newStreak = current.prayer_streak ?? 0;
    if (daysDiff === 0) {
      // already prayed today — keep streak
    } else if (daysDiff === 1) {
      newStreak = newStreak + 1;
    } else {
      newStreak = 1;
    }

    updateData.last_prayed_at = now.toISOString();
    updateData.prayer_streak = newStreak;
    updateData.pray_for_person = true;
    updateData.pray_for_opportunity = true;
    updateData.pray_for_courage = true;
    updateData.pray_for_holy_spirit = true;
  }

  const directFields = [
    'status', 'pray_for_person', 'pray_for_opportunity',
    'pray_for_courage', 'pray_for_holy_spirit', 'notes',
    'accepted_christ', 'connected_to_church',
  ] as const;

  for (const field of directFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  if (body.accepted_christ === true && !current.accepted_christ) {
    updateData.accepted_christ_at = new Date().toISOString();
    updateData.status = 'accepted_christ';

    await adminClient().from('evangelism_celebrations').insert({
      church_id: churchId,
      first_name: current.first_name,
      relationship: current.relationship,
    });
  }

  const { error } = await adminClient()
    .from('prayer_targets')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { error } = await adminClient()
    .from('prayer_targets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
