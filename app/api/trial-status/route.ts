import { createClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(_req: NextRequest) {
  // Identify user via SSR cookie session (written by /auth/callback).
  const ssrClient = await createSSRClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

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
