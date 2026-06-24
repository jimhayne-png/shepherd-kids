import { createClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { type NextRequest } from 'next/server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Stripe statuses that explicitly grant access.
const ALLOWED_STATUSES = new Set(['active', 'trialing']);
// Stripe statuses that explicitly revoke access.
const DENIED_STATUSES = new Set(['canceled', 'past_due', 'unpaid', 'incomplete_expired']);

export async function GET(_req: NextRequest) {
  const ssrClient = await createSSRClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  // Master admin and owner accounts always bypass billing gate.
  const masterAdminEmail = (process.env.MASTER_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const ownerEmails = (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = (user.email ?? '').toLowerCase();
  if (
    (masterAdminEmail && userEmail === masterAdminEmail) ||
    ownerEmails.includes(userEmail)
  ) {
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
    .select('trial_ends_at')
    .eq('id', cu.church_id)
    .single();

  if (!church) {
    return Response.json({ expired: false, is_owner: false, trial_ends_at: null });
  }

  const { data: sub } = await admin
    .from('church_subscriptions')
    .select('status, admin_override_enabled, admin_override_until')
    .eq('church_id', cu.church_id)
    .maybeSingle();

  const now = new Date();

  // Admin override: grants access regardless of Stripe status.
  if (sub?.admin_override_enabled) {
    const overrideUntil = sub.admin_override_until ? new Date(sub.admin_override_until) : null;
    if (!overrideUntil || overrideUntil > now) {
      return Response.json({ expired: false, is_owner: false, trial_ends_at: church.trial_ends_at });
    }
  }

  const stripeStatus = sub?.status ?? null;

  // Stripe says active → allow.
  if (stripeStatus && ALLOWED_STATUSES.has(stripeStatus)) {
    return Response.json({ expired: false, is_owner: false, trial_ends_at: church.trial_ends_at });
  }

  // Stripe says explicitly bad → deny.
  if (stripeStatus && DENIED_STATUSES.has(stripeStatus)) {
    return Response.json({ expired: true, is_owner: false, trial_ends_at: church.trial_ends_at });
  }

  // No Stripe subscription yet (no row, incomplete, or paused) → redirect to billing.
  return Response.json({ expired: false, needsBilling: true, is_owner: false, trial_ends_at: church.trial_ends_at });
}
