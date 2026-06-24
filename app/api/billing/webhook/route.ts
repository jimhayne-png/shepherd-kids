import { type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// ── helpers ──────────────────────────────────────────────────────────────────

function customerId(obj: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!obj) return null;
  return typeof obj === 'string' ? obj : obj.id;
}

function subscriptionId(obj: string | Stripe.Subscription | null): string | null {
  if (!obj) return null;
  return typeof obj === 'string' ? obj : obj.id;
}

async function churchIdFromCustomer(custId: string): Promise<string | null> {
  const { data } = await adminClient()
    .from('church_subscriptions')
    .select('church_id')
    .eq('stripe_customer_id', custId)
    .maybeSingle();
  return data?.church_id ?? null;
}

// Map Stripe subscription status → churches.subscription_status.
// The existing trial-status route grants access when status === 'active',
// so we treat trialing (card on file, trial period) as 'active' as well.
function toAppStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      // incomplete, paused — leave as trial so existing logic handles access
      return 'trial';
  }
}

async function syncSubscription(sub: Stripe.Subscription) {
  const admin = adminClient();

  const custId = customerId(sub.customer);
  if (!custId) return;

  const churchId =
    sub.metadata?.church_id || (await churchIdFromCustomer(custId));
  if (!churchId) {
    console.error('[webhook] no church_id for subscription', sub.id);
    return;
  }

  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;

  await admin.from('church_subscriptions').upsert(
    {
      church_id: churchId,
      stripe_customer_id: custId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      trial_end: trialEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'church_id' }
  );

  await admin
    .from('churches')
    .update({ subscription_status: toAppStatus(sub.status) })
    .eq('id', churchId);
}

// ── route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[webhook] signature verification failed:', msg);
    return Response.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  const admin = adminClient();

  try {
    switch (event.type) {
      // ── Checkout completed — link customer + subscription IDs ──────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const churchId = session.metadata?.church_id;
        if (!churchId) break;

        const custId = customerId(session.customer);
        const subId = subscriptionId(session.subscription);
        if (!custId) break;

        await admin.from('church_subscriptions').upsert(
          {
            church_id: churchId,
            stripe_customer_id: custId,
            ...(subId ? { stripe_subscription_id: subId } : {}),
            status: 'incomplete',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'church_id' }
        );
        break;
      }

      // ── Subscription created or updated — full sync ────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      // ── Subscription deleted ───────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const custId = customerId(sub.customer);
        if (!custId) break;

        const churchId = sub.metadata?.church_id || (await churchIdFromCustomer(custId));
        if (!churchId) break;

        await admin.from('church_subscriptions').upsert(
          {
            church_id: churchId,
            stripe_customer_id: custId,
            stripe_subscription_id: sub.id,
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'church_id' }
        );
        await admin
          .from('churches')
          .update({ subscription_status: 'canceled' })
          .eq('id', churchId);
        break;
      }

      // ── Invoice paid — confirm active / post-trial state ──────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = subscriptionId(
          invoice.parent?.subscription_details?.subscription ?? null
        );
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        await syncSubscription(sub);
        break;
      }

      // ── Invoice payment failed — mark past_due ────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const custId = customerId(invoice.customer);
        const subId = subscriptionId(
          invoice.parent?.subscription_details?.subscription ?? null
        );
        if (!custId || !subId) break;

        const churchId = await churchIdFromCustomer(custId);
        if (!churchId) break;

        await admin.from('church_subscriptions').upsert(
          {
            church_id: churchId,
            stripe_customer_id: custId,
            stripe_subscription_id: subId,
            status: 'past_due',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'church_id' }
        );
        await admin
          .from('churches')
          .update({ subscription_status: 'past_due' })
          .eq('id', churchId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return Response.json({ received: true });
}
