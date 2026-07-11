import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

const CHURCH_FIELDS = [
  'name', 'slug', 'email', 'phone', 'website',
  'address', 'city', 'state', 'zip', 'logo_url', 'pastor_email',
  'timezone', 'subscription_status', 'subscription_tier', 'trial_ends_at',
  'check_in_opens_minutes_before', 'check_in_closes_minutes_after',
  'label_mode', 'typical_class_duration_minutes',
  'smart_label_qr_enabled', 'volunteer_checkin_qr_enabled', 'qr_checkin_enabled',
  'senior_pastor', 'children_pastor',
].join(', ');

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await adminClient()
    .from('churches')
    .select(CHURCH_FIELDS)
    .eq('id', ctx.churchId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ church: data });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const allowed = [
    'name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'website', 'logo_url',
    'senior_pastor', 'children_pastor',
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
    .eq('id', ctx.churchId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
