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

export async function GET(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(CURRENT_YEAR));
  const { data } = await adminClient().from('annual_pastor_touch_log').select('*').eq('church_id', churchId).eq('member_id', memberId).eq('year', year).maybeSingle();
  return Response.json({ log: data ?? { call_done: false, letter_done: false, prayer_done: false } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const { touch_type, date, note, letter_content, year = CURRENT_YEAR } = body;
  if (!touch_type || !['call', 'letter', 'prayer'].includes(touch_type)) {
    return Response.json({ error: 'touch_type must be call, letter, or prayer' }, { status: 400 });
  }

  const admin = adminClient();

  // Get pastor_id from assignment
  const { data: assignment } = await admin.from('annual_pastor_touch_assignments').select('pastor_id').eq('church_id', churchId).eq('member_id', memberId).eq('year', year).maybeSingle();

  const { data: existing } = await admin.from('annual_pastor_touch_log').select('id').eq('church_id', churchId).eq('member_id', memberId).eq('year', year).maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const updates: Record<string, unknown> = {
    [`${touch_type}_done`]: true,
    [`${touch_type}_date`]: date || today,
    [`${touch_type}_note`]: note?.trim() || null,
  };
  if (touch_type === 'letter') {
    updates.letter_generated_at = new Date().toISOString();
    if (letter_content) updates.letter_edited_content = letter_content;
  }

  let record;
  if (existing) {
    const { data } = await admin.from('annual_pastor_touch_log').update(updates).eq('id', existing.id).select('*').single();
    record = data;
  } else {
    const { data } = await admin.from('annual_pastor_touch_log').insert({
      church_id: churchId, year, member_id: memberId, pastor_id: assignment?.pastor_id ?? null, ...updates,
    }).select('*').single();
    record = data;
  }

  return Response.json({ log: record });
}
