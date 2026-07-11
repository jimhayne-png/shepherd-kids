import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';

// Columns confirmed present in all production instances.
const CORE_FIELDS = [
  'name', 'email', 'phone', 'website',
  'address', 'city', 'state', 'zip', 'logo_url', 'timezone',
  'subscription_status', 'subscription_tier', 'trial_ends_at',
  'check_in_opens_minutes_before', 'check_in_closes_minutes_after', 'typical_class_duration_minutes',
  'label_mode', 'smart_label_qr_enabled', 'volunteer_checkin_qr_enabled', 'qr_checkin_enabled',
].join(', ');

// Added via 20260711 migration — queried separately so a missing column never breaks core load.
const PASTORAL_FIELDS = 'senior_pastor, children_pastor';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const { data: coreData, error: coreError } = await admin
    .from('churches')
    .select(CORE_FIELDS)
    .eq('id', ctx.churchId)
    .single();

  if (coreError) {
    console.error('[settings GET] core query failed:', coreError.message);
    return Response.json({ error: 'Unable to load church settings. Please try again.' }, { status: 500 });
  }

  const warnings: string[] = [];
  let pastoral: { senior_pastor: string | null; children_pastor: string | null } = {
    senior_pastor: null,
    children_pastor: null,
  };

  const { data: pastoralData, error: pastoralError } = await admin
    .from('churches')
    .select(PASTORAL_FIELDS)
    .eq('id', ctx.churchId)
    .single();

  if (pastoralError) {
    console.error('[settings GET] pastoral query failed:', pastoralError.message);
    warnings.push('pastoral_leadership_unavailable');
  } else if (pastoralData) {
    const p = pastoralData as unknown as { senior_pastor?: string | null; children_pastor?: string | null };
    pastoral = {
      senior_pastor:   p.senior_pastor   ?? null,
      children_pastor: p.children_pastor ?? null,
    };
  }

  return Response.json({
    church: { ...(coreData as unknown as Record<string, unknown>), ...pastoral },
    warnings,
  });
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
