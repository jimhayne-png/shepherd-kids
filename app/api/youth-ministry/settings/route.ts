import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

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

  const { data } = await adminClient()
    .from('youth_settings')
    .select('*')
    .eq('church_id', churchId)
    .maybeSingle();

  return Response.json({ settings: data ?? {} });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const { middle_school_pastor, senior_high_pastor, same_pastor, include_6th_grade, permission_renewal_months } = body;

  const { error } = await adminClient()
    .from('youth_settings')
    .upsert({
      church_id: churchId,
      middle_school_pastor: middle_school_pastor ?? '',
      senior_high_pastor: senior_high_pastor ?? '',
      same_pastor: same_pastor ?? false,
      include_6th_grade: include_6th_grade ?? true,
      permission_renewal_months: permission_renewal_months ?? 12,
    }, { onConflict: 'church_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
