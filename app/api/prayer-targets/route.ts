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

  const [targetsRes, celebrationsRes] = await Promise.all([
    adminClient()
      .from('prayer_targets')
      .select('id, first_name, relationship, status, pray_for_person, pray_for_opportunity, pray_for_courage, pray_for_holy_spirit, last_prayed_at, prayer_streak, notes, accepted_christ, accepted_christ_at, connected_to_church')
      .eq('user_id', user.id)
      .eq('church_id', churchId)
      .order('created_at', { ascending: true }),
    adminClient()
      .from('evangelism_celebrations')
      .select('id, first_name, relationship, celebrated_at')
      .eq('church_id', churchId)
      .order('celebrated_at', { ascending: false })
      .limit(30),
  ]);

  return Response.json({
    targets: targetsRes.data ?? [],
    celebrations: celebrationsRes.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await request.json();
  const { firstName, relationship, notes } = body;

  if (!firstName?.trim()) return Response.json({ error: 'First name is required' }, { status: 400 });
  if (!relationship) return Response.json({ error: 'Relationship is required' }, { status: 400 });

  // Check max 3 targets
  const { count } = await adminClient()
    .from('prayer_targets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('church_id', churchId);

  if ((count ?? 0) >= 3) {
    return Response.json({ error: 'Maximum of 3 prayer targets reached' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('prayer_targets')
    .insert({
      church_id: churchId,
      user_id: user.id,
      first_name: firstName.trim(),
      relationship,
      notes: notes?.trim() || null,
      status: 'praying',
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true, id: data.id });
}
