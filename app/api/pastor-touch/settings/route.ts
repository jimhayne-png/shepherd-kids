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

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const admin = adminClient();
  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(CURRENT_YEAR));

  const { data: settings } = await admin.from('annual_pastor_touch_settings').select('*').eq('church_id', churchId).eq('year', year).maybeSingle();
  const { data: staff } = await admin.from('pastoral_staff').select('*').eq('church_id', churchId).order('active', { ascending: false }).order('name');

  return Response.json({
    settings: settings ?? { church_id: churchId, year, mode: 'single' },
    staff: staff ?? [],
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { year, mode } = await req.json();
  const admin = adminClient();

  const { data: existing } = await admin.from('annual_pastor_touch_settings').select('id').eq('church_id', churchId).eq('year', year ?? CURRENT_YEAR).maybeSingle();

  let data;
  if (existing) {
    const { data: d } = await admin.from('annual_pastor_touch_settings').update({ mode }).eq('id', existing.id).select('*').single();
    data = d;
  } else {
    const { data: d } = await admin.from('annual_pastor_touch_settings').insert({ church_id: churchId, year: year ?? CURRENT_YEAR, mode: mode ?? 'single' }).select('*').single();
    data = d;
  }

  return Response.json({ settings: data });
}
