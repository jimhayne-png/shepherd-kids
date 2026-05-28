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

  const admin = adminClient();
  const cfg = MINISTRY_CONFIG[type];

  let firstName: string, lastName: string;
  let email: string | null = null, phone: string | null = null, birthdate: string | null = null;
  let markPromoted: () => Promise<void>;

  if (type === 'childrens') {
    const { data: child } = await admin
      .from('cm_visitor_children')
      .select('first_name, last_name, date_of_birth, family_id')
      .eq('id', visitorId)
      .eq('church_id', churchId)
      .maybeSingle();
    if (!child) return Response.json({ error: 'Visitor not found' }, { status: 404 });

    if (child.family_id) {
      const { data: fam } = await admin
        .from('cm_visitor_families')
        .select('parent1_email, parent1_phone')
        .eq('id', child.family_id)
        .maybeSingle();
      email = fam?.parent1_email ?? null;
      phone = fam?.parent1_phone ?? null;
    }

    firstName = child.first_name;
    lastName = child.last_name;
    birthdate = child.date_of_birth ?? null;
    const familyId = child.family_id;
    markPromoted = async () => {
      if (familyId) {
        await admin.from('cm_visitor_families').update({ status: 'promoted' }).eq('id', familyId);
      }
    };
  } else {
    const { data: visitor } = await admin
      .from('ministry_visitors')
      .select('*')
      .eq('id', visitorId)
      .eq('church_id', churchId)
      .maybeSingle();
    if (!visitor) return Response.json({ error: 'Visitor not found' }, { status: 404 });

    firstName = visitor.first_name;
    lastName = visitor.last_name;
    email = visitor.email ?? null;
    phone = visitor.phone ?? null;
    markPromoted = async () => {
      await admin.from('ministry_visitors').update({
        status: 'promoted',
        promoted_to_member: true,
        promoted_at: new Date().toISOString(),
      }).eq('id', visitorId);
    };
  }

  // Always insert into members table
  const { data: member, error: memberErr } = await admin.from('members').insert({
    church_id: churchId,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    birthdate,
    member_type: 'member',
    status: 'active',
  }).select('id').single();

  if (memberErr || !member) {
    return Response.json({ error: memberErr?.message ?? 'Failed to create member' }, { status: 500 });
  }

  // Add to ministry roster using the real member ID
  const { error: rosterErr } = await admin.from('ministry_rosters').upsert({
    church_id: churchId,
    ministry_type: type,
    member_id: member.id,
    status: 'active',
    pipeline_stage: cfg?.stages[0] ?? null,
  }, { onConflict: 'church_id,ministry_type,member_id', ignoreDuplicates: true });

  if (rosterErr) {
    return Response.json({ error: rosterErr.message }, { status: 500 });
  }

  await markPromoted();

  return Response.json({ success: true, member_id: member.id });
}
