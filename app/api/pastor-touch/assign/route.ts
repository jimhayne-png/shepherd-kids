import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { CURRENT_YEAR } from '@/lib/pastor-touch';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await adminClient().auth.getUser(token);
  return user ?? null;
}
async function getChurchId(userId: string) {
  const { data } = await adminClient().from('church_users').select('church_id').eq('user_id', userId).maybeSingle();
  return data?.church_id ?? null;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { year = CURRENT_YEAR } = await req.json();
  const admin = adminClient();

  // Get settings to determine mode
  const { data: settings } = await admin.from('annual_pastor_touch_settings').select('mode').eq('church_id', churchId).eq('year', year).maybeSingle();
  const mode = settings?.mode ?? 'single';

  // Get active members (sorted alphabetically for consistent ordering)
  const { data: members } = await admin.from('members').select('id').eq('church_id', churchId).eq('status', 'active').order('last_name').order('first_name');
  if (!members?.length) return Response.json({ error: 'No active members found' }, { status: 400 });

  let activeStaff: any[] = [];

  if (mode === 'single') {
    // Single pastor mode — ensure one staff record exists
    const { data: existing } = await admin.from('pastoral_staff').select('*').eq('church_id', churchId).eq('active', true).limit(1).maybeSingle();
    if (existing) {
      activeStaff = [existing];
    } else {
      // Create a default staff record for the admin
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(user.id);
      const { data: newStaff } = await admin.from('pastoral_staff').insert({
        church_id: churchId,
        name: authUser?.user_metadata?.full_name ?? authUser?.email?.split('@')[0] ?? 'Pastor',
        title: 'Pastor',
        email: authUser?.email ?? null,
        active: true,
      }).select('*').single();
      activeStaff = newStaff ? [newStaff] : [];
    }
  } else {
    const { data: staff } = await admin.from('pastoral_staff').select('*').eq('church_id', churchId).eq('active', true).order('name');
    activeStaff = staff ?? [];
  }

  if (!activeStaff.length) return Response.json({ error: 'No active pastoral staff found' }, { status: 400 });

  // Clear existing assignments for this year
  await admin.from('annual_pastor_touch_assignments').delete().eq('church_id', churchId).eq('year', year);

  // Distribute members evenly across pastors, assign week numbers 1-52
  const membersPerPastor = Math.ceil(members.length / activeStaff.length);
  const assignments: any[] = [];
  const WEEKS = 52;

  for (let pi = 0; pi < activeStaff.length; pi++) {
    const pastor = activeStaff[pi];
    const start = pi * membersPerPastor;
    const end = Math.min(start + membersPerPastor, members.length);
    const pastorMembers = members.slice(start, end);
    const membersPerWeek = Math.max(1, Math.ceil(pastorMembers.length / WEEKS));

    for (let mi = 0; mi < pastorMembers.length; mi++) {
      const weekNumber = Math.min(WEEKS, Math.floor(mi / membersPerWeek) + 1);
      assignments.push({
        church_id: churchId,
        year,
        member_id: pastorMembers[mi].id,
        pastor_id: pastor.id,
        week_number: weekNumber,
      });
    }
  }

  // Batch insert (Supabase allows up to 1000 per request)
  const BATCH = 500;
  for (let i = 0; i < assignments.length; i += BATCH) {
    await admin.from('annual_pastor_touch_assignments').insert(assignments.slice(i, i + BATCH));
  }

  const weeksUsed = [...new Set(assignments.map(a => a.week_number))].length;

  return Response.json({
    assigned: assignments.length,
    pastors: activeStaff.length,
    weeks_used: weeksUsed,
    members_per_week: Math.round(assignments.length / weeksUsed),
  });
}
