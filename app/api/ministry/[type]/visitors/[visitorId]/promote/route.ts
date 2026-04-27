import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { MINISTRY_CONFIG } from '@/lib/ministry-config';

function adminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string; visitorId: string }> }) {
  const { type, visitorId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { also_add_to_members } = await req.json();
  const admin = adminClient();
  const cfg = MINISTRY_CONFIG[type];

  const { data: visitor } = await admin.from('ministry_visitors').select('*').eq('id', visitorId).eq('church_id', churchId).maybeSingle();
  if (!visitor) return Response.json({ error: 'Visitor not found' }, { status: 404 });

  // Add to ministry roster
  const { error: rosterErr } = await admin.from('ministry_rosters').upsert({
    church_id: churchId,
    ministry_type: type,
    member_id: visitorId, // using visitor id as soft link (no FK)
    status: 'active',
    pipeline_stage: cfg?.stages[0] ?? null,
  }, { onConflict: 'church_id,ministry_type,member_id', ignoreDuplicates: true });

  // Optionally add to main members table
  let memberId: string | null = null;
  if (also_add_to_members) {
    const { data: member } = await admin.from('members').insert({
      church_id: churchId,
      first_name: visitor.first_name,
      last_name: visitor.last_name,
      email: visitor.email ?? null,
      phone: visitor.phone ?? null,
      member_type: 'member',
      status: 'active',
    }).select('id').single();
    memberId = member?.id ?? null;
  }

  // Mark visitor as promoted
  await admin.from('ministry_visitors').update({
    status: 'promoted',
    promoted_to_member: true,
    promoted_at: new Date().toISOString(),
  }).eq('id', visitorId);

  return Response.json({ success: true, member_id: memberId });
}
