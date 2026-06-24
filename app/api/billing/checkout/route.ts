import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const { data: church } = await admin
    .from('churches')
    .select('id, name, email, trial_ends_at')
    .eq('id', auth.churchId)
    .single();

  if (!church) return Response.json({ error: 'Church not found' }, { status: 404 });

  // Get existing Stripe record if any
  const { data: existingSub } = await admin
    .from('church_subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('church_id', auth.churchId)
    .maybeSingle();

  // Already has an active or trialing Stripe subscription — use the portal instead
  if (
    existingSub?.stripe_subscription_id &&
    (existingSub.status === 'active' || existingSub.status === 'trialing')
  ) {
    return Response.json(
      { error: 'Already subscribed. Use Manage Subscription to make changes.' },
      { status: 400 }
    );
  }

  // Get or create Stripe customer
  let customerId = existingSub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: church.name,
      email: church.email ?? undefined,
      metadata: { church_id: auth.churchId },
    });
    customerId = customer.id;

    await admin.from('church_subscriptions').upsert(
      {
        church_id: auth.churchId,
        stripe_customer_id: customerId,
        status: 'incomplete',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'church_id' }
    );
  }

  // Map remaining app-trial time onto Stripe trial so the customer isn't
  // charged until their original trial window ends.
  const now = new Date();
  const trialEnd = church.trial_ends_at ? new Date(church.trial_ends_at) : null;
  const hasActiveTrial = trialEnd && trialEnd > now;

  type SubData = {
    metadata: { church_id: string };
    trial_end?: number;
    trial_period_days?: number;
  };
  const subscriptionData: SubData = { metadata: { church_id: auth.churchId } };

  if (hasActiveTrial) {
    subscriptionData.trial_end = Math.floor(trialEnd.getTime() / 1000);
  } else {
    // Trial already expired — give a 14-day Stripe trial for new subscribers
    subscriptionData.trial_period_days = 14;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, '');

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: subscriptionData,
    allow_promotion_codes: true,
    success_url: `${baseUrl}/dashboard/billing?success=1`,
    cancel_url: `${baseUrl}/dashboard/billing?canceled=1`,
    metadata: { church_id: auth.churchId },
  });

  return Response.json({ url: session.url });
}
