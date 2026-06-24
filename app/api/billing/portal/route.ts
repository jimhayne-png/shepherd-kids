import { type NextRequest } from 'next/server';
import { getAuthContext, adminClient } from '@/lib/api-auth';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();

  const { data: sub } = await admin
    .from('church_subscriptions')
    .select('stripe_customer_id')
    .eq('church_id', auth.churchId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return Response.json({ error: 'No billing account found.' }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, '');

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${baseUrl}/dashboard/billing`,
  });

  return Response.json({ url: portalSession.url });
}
