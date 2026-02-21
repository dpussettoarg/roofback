import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {

  // ── 1. Verify every required env var individually ─────────────────────────
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is not set in environment variables')
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not configured' }, { status: 500 })
  }
  if (!stripe) {
    console.error('CRITICAL: Stripe client not initialised — STRIPE_SECRET_KEY missing?')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  // Validate admin client is constructible (throws with exact var name if not)
  try {
    getSupabaseAdmin()
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
  }

  // ── 2. Read raw body BEFORE any other async work ──────────────────────────
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] Request missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // ── 3. Verify Stripe signature ────────────────────────────────────────────
  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Stripe Webhook] Signature verification FAILED: ${msg}`)
    return NextResponse.json({ error: `Webhook signature error: ${msg}` }, { status: 400 })
  }

  console.log(`[Stripe Webhook] ✅ Webhook Signature Verified — event: ${event.type} (${event.id})`)

  // Instantiate admin client once for this request (bypasses RLS)
  const db = getSupabaseAdmin()

  switch (event.type) {

    // ── checkout.session.completed → activate subscription ────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as import('stripe').Stripe.Checkout.Session

      // client_reference_id is set to user.id in app/actions/stripe.ts
      const userId = session.client_reference_id
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

      console.log(
        `[Stripe Webhook] checkout.session.completed — ` +
        `client_reference_id=${userId ?? 'MISSING'} ` +
        `customer=${customerId ?? 'none'} ` +
        `subscription=${subscriptionId ?? 'none'}`
      )

      if (!userId) {
        // Return 200 — Stripe would retry 4xx/5xx forever; this is a data issue
        console.error(
          '[Stripe Webhook] ❌ No client_reference_id on session. ' +
          'Ensure createCheckoutSession() sets client_reference_id: user.id'
        )
        return NextResponse.json({ received: true, warning: 'Missing client_reference_id' })
      }

      // Resolve price_id from subscription (non-fatal if it fails)
      let priceId: string | null = null
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          priceId = sub.items.data[0]?.price?.id ?? null
        } catch (err) {
          console.warn('[Stripe Webhook] Could not retrieve price_id from subscription:', err)
        }
      }

      console.log(`[Stripe Webhook] ✏️  Updating Profile for User ID: ${userId}`)

      const { error: dbError, count } = await db
        .from('profiles')
        .update({
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          subscription_status: 'active',
          price_id: priceId,
          trial_expires_at: null, // paying customer — clear trial
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id') // ensure we can count matched rows

      if (dbError) {
        console.error('[Stripe Webhook] ❌ DB update failed:', JSON.stringify(dbError))
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      console.log(
        `[Stripe Webhook] ✅ Profile Updated Successfully — ` +
        `user_id=${userId} rows_affected=${count ?? 'unknown'} status=active`
      )
      break
    }

    // ── customer.subscription.updated → sync status ───────────────────────
    case 'customer.subscription.updated': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

      if (!customerId) {
        console.warn('[Stripe Webhook] customer.subscription.updated: no customer id — skipping')
        return NextResponse.json({ received: true })
      }

      const stripeStatus = subscription.status
      const subscriptionStatus =
        stripeStatus === 'active' || stripeStatus === 'trialing' ? 'active'
          : stripeStatus === 'past_due' ? 'past_due'
            : 'canceled'

      const priceId = subscription.items.data[0]?.price?.id ?? null
      const updatePayload: Record<string, unknown> = {
        stripe_subscription_id: subscription.id,
        subscription_status: subscriptionStatus,
        price_id: priceId,
        updated_at: new Date().toISOString(),
      }
      if (subscriptionStatus === 'active') {
        updatePayload.trial_expires_at = null
      }

      console.log(`[Stripe Webhook] ✏️  Updating Profile for Customer: ${customerId} → status=${subscriptionStatus}`)

      const { error: dbError } = await db
        .from('profiles')
        .update(updatePayload)
        .eq('stripe_customer_id', customerId)

      if (dbError) {
        console.error('[Stripe Webhook] ❌ subscription.updated DB update failed:', JSON.stringify(dbError))
      } else {
        console.log(`[Stripe Webhook] ✅ Profile Updated Successfully — customer=${customerId} status=${subscriptionStatus}`)
      }
      break
    }

    // ── customer.subscription.deleted → cancel access ─────────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

      if (!customerId) {
        console.warn('[Stripe Webhook] customer.subscription.deleted: no customer id — skipping')
        return NextResponse.json({ received: true })
      }

      console.log(`[Stripe Webhook] ✏️  Updating Profile for Customer: ${customerId} → status=canceled`)

      const { error: dbError } = await db
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId)

      if (dbError) {
        console.error('[Stripe Webhook] ❌ subscription.deleted DB update failed:', JSON.stringify(dbError))
      } else {
        console.log(`[Stripe Webhook] ✅ Profile Updated Successfully — customer=${customerId} status=canceled`)
      }
      break
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type} — ignored`)
      break
  }

  return NextResponse.json({ received: true })
}
