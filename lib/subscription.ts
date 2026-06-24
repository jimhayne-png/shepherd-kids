import { adminClient } from '@/lib/api-auth';

export type SubscriptionStatus =
  | 'trial'              // App-level trial, no Stripe subscription yet
  | 'trialing'           // Stripe subscription in trial period
  | 'active'             // Paid and current
  | 'past_due'           // Payment failed
  | 'canceled'           // Canceled
  | 'incomplete'         // Checkout started, payment not yet confirmed
  | 'incomplete_expired' // Checkout window expired
  | 'unpaid'             // Invoices unpaid
  | 'paused'             // Paused by Stripe
  | 'expired';           // App trial expired, no Stripe subscription

export type SubscriptionInfo = {
  hasAccess: boolean;
  source: 'trial' | 'stripe' | 'none';
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export async function getSubscriptionInfo(churchId: string): Promise<SubscriptionInfo> {
  const admin = adminClient();

  const { data: sub } = await admin
    .from('church_subscriptions')
    .select('*')
    .eq('church_id', churchId)
    .maybeSingle();

  if (sub?.stripe_subscription_id) {
    const status = sub.status as SubscriptionStatus;
    const hasAccess = status === 'trialing' || status === 'active';
    return {
      hasAccess,
      source: 'stripe',
      status,
      trialEndsAt: sub.trial_end ?? null,
      currentPeriodEnd: sub.current_period_end ?? null,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      stripeCustomerId: sub.stripe_customer_id ?? null,
      stripeSubscriptionId: sub.stripe_subscription_id,
    };
  }

  // Fall back to app-level trial in churches table
  const { data: church } = await admin
    .from('churches')
    .select('subscription_status, trial_ends_at')
    .eq('id', churchId)
    .single();

  if (!church) {
    return noAccess();
  }

  if (church.subscription_status === 'active') {
    return {
      hasAccess: true,
      source: 'stripe',
      status: 'active',
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: sub?.stripe_customer_id ?? null,
      stripeSubscriptionId: null,
    };
  }

  const trialEndsAt = church.trial_ends_at ?? null;
  const isTrialActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;

  return {
    hasAccess: isTrialActive,
    source: 'trial',
    status: isTrialActive ? 'trial' : 'expired',
    trialEndsAt,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: sub?.stripe_customer_id ?? null,
    stripeSubscriptionId: null,
  };
}

function noAccess(): SubscriptionInfo {
  return {
    hasAccess: false,
    source: 'none',
    status: 'expired',
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
}
