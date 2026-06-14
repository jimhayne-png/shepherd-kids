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

const CHURCH_FIELDS = [
  'name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'website', 'logo_url',
  'senior_pastor', 'children_pastor', 'youth_pastor', 'choir_director',
  'mens_ministry_leader', 'womens_ministry_leader', 'young_adult_leader', 'senior_ministry_leader',
  'subscription_status', 'subscription_tier', 'trial_ends_at', 'timezone',
  'check_in_opens_minutes_before', 'typical_class_duration_minutes', 'check_in_closes_minutes_after',
  'label_mode', 'smart_label_qr_enabled', 'volunteer_checkin_qr_enabled',
].join(', ');

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const { data, error } = await adminClient()
    .from('churches')
    .select(CHURCH_FIELDS)
    .eq('id', churchId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ church: data });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const churchId = await getChurchId(user.id);
  if (!churchId) return Response.json({ error: 'No church found' }, { status: 403 });

  const body = await req.json();
  const allowed = [
    'name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'website', 'logo_url',
    'senior_pastor', 'children_pastor', 'youth_pastor', 'choir_director',
    'mens_ministry_leader', 'womens_ministry_leader', 'young_adult_leader', 'senior_ministry_leader',
    'timezone',
  ];
  const integerFields = ['check_in_opens_minutes_before', 'typical_class_duration_minutes', 'check_in_closes_minutes_after'];
  const enumFields: Record<string, string[]> = { label_mode: ['smart', 'classic'] };
  const booleanFields = ['smart_label_qr_enabled', 'volunteer_checkin_qr_enabled'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] ?? '';
  }
  for (const key of integerFields) {
    if (key in body) {
      const val = Number(body[key]);
      if (!Number.isInteger(val) || val < 1) {
        return Response.json({ error: `${key} must be a positive integer` }, { status: 400 });
      }
      updates[key] = val;
    }
  }
  for (const [key, validValues] of Object.entries(enumFields)) {
    if (key in body) {
      if (!validValues.includes(body[key])) {
        return Response.json({ error: `${key} must be one of: ${validValues.join(', ')}` }, { status: 400 });
      }
      updates[key] = body[key];
    }
  }
  for (const key of booleanFields) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') {
        return Response.json({ error: `${key} must be a boolean` }, { status: 400 });
      }
      updates[key] = body[key];
    }
  }

  const { error } = await adminClient()
    .from('churches')
    .update(updates)
    .eq('id', churchId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
