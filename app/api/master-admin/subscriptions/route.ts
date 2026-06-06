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

async function checkMasterAdmin(req: NextRequest): Promise<boolean> {
  const user = await getAuthUser(req);
  if (!user?.email) return false;
  console.log("MASTER ADMIN USER EMAIL:", user.email);
  console.log("OWNER_EMAILS:", process.env.OWNER_EMAILS);
  const masterEmails = (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return masterEmails.includes(user.email.toLowerCase());
}

const CHURCH_SELECT =
  'id, name, city, state, email, phone, subscription_status, subscription_tier, trial_ends_at, created_at';

export async function GET(req: NextRequest) {
  const ok = await checkMasterAdmin(req);
  if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await adminClient()
    .from('churches')
    .select(CHURCH_SELECT)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ churches: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const ok = await checkMasterAdmin(req);
  if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { churchId, action } = body as { churchId: string; action: string };
  if (!churchId || !action) {
    return Response.json({ error: 'churchId and action required' }, { status: 400 });
  }

  const admin = adminClient();
  const now = new Date();

  let updates: Record<string, unknown> = {};

  if (action === 'reset_trial_30' || action === 'reactivate_trial') {
    const newDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    updates = { subscription_status: 'trial', trial_ends_at: newDate.toISOString() };
  } else if (action === 'extend_trial_7' || action === 'extend_trial_30') {
    const days = action === 'extend_trial_7' ? 7 : 30;
    const { data: church } = await admin
      .from('churches')
      .select('trial_ends_at')
      .eq('id', churchId)
      .single();
    // Extend from current trial_ends_at if it's still in the future; otherwise extend from now
    const base =
      church?.trial_ends_at && new Date(church.trial_ends_at) > now
        ? new Date(church.trial_ends_at)
        : now;
    const newDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    updates = { subscription_status: 'trial', trial_ends_at: newDate.toISOString() };
  } else if (action === 'mark_paid') {
    updates = { subscription_status: 'active', subscription_tier: 'paid' };
  } else if (action === 'suspend') {
    updates = { subscription_status: 'suspended' };
  } else {
    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const { data, error } = await admin
    .from('churches')
    .update(updates)
    .eq('id', churchId)
    .select(CHURCH_SELECT)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ church: data });
}
