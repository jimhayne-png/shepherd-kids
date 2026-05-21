import { createClient } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Owner accounts are always active — never show trial expired.
  const ownerEmails = (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (ownerEmails.includes((user.email ?? '').toLowerCase())) {
    return Response.json({ expired: false, is_owner: true, trial_ends_at: null });
  }

  const { data: cu } = await admin
    .from('church_users')
    .select('church_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!cu?.church_id) {
    return Response.json({ expired: false, is_owner: false, trial_ends_at: null });
  }

  const { data: church } = await admin
    .from('churches')
    .select('trial_ends_at, subscription_status')
    .eq('id', cu.church_id)
    .single();

  if (!church) {
    return Response.json({ expired: false, is_owner: false, trial_ends_at: null });
  }

  // Active subscription overrides trial expiry.
  if (church.subscription_status === 'active') {
    return Response.json({ expired: false, is_owner: false, trial_ends_at: church.trial_ends_at });
  }

  // No trial date set means no enforcement.
  if (!church.trial_ends_at) {
    return Response.json({ expired: false, is_owner: false, trial_ends_at: null });
  }

  const expired = new Date(church.trial_ends_at) < new Date();
  return Response.json({ expired, is_owner: false, trial_ends_at: church.trial_ends_at });
}
