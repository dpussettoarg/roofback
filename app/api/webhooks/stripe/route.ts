import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  // ── Diagnostic guard: log exactly which env/config is missing ─────────────
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  if (!webhookSecret) {
    console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is not defined in environment variables')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }
  if (!stripe) {
    console.error('CRITICAL: Stripe client is not initialised (STRIPE_SECRET_KEY missing?)')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  if (!supabaseAdmin) {
    console.error('CRITICAL: supabaseAdmin is not initialised (SUPABASE_SERVICE_ROLE_KEY missing?)')
    return NextResponse.json({ error: 'Database admin client not configured' }, { status: 500 })
  }

  // ── Read raw body BEFORE any other async work ─────────────────────────────
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // ── Verify webhook signature ───────────────────────────────────────────────
  let event: import('stripe').Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    console.error('[Stripe Webhook] Signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook signature error: ${msg}` }, { status: 400 })
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`)

  switch (event.type) {

    // ── Payment completed → activate subscription ──────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as import('stripe').Stripe.Checkout.Session

      const userId = session.client_reference_id
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

      if (!userId) {
        console.error('[Stripe Webhook] checkout.session.completed: missing client_reference_id')
        // Return 200 so Stripe doesn't retry — it's a data issue not a server issue
        return NextResponse.json({ received: true, warning: 'Missing user reference' })
      }

      // Retrieve price_id from the subscription object
      let priceId: string | null = null
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          priceId = sub.items.data[0]?.price?.id ?? null
        } catch (err) {
          console.warn('[Stripe Webhook] Could not retrieve subscription for price_id:', err)
        }
      }

      const { error: dbError } = await supabaseAdmin
        .from('profiles')
        .update({
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          subscription_status: 'active',
          price_id: priceId,
          trial_expires_at: null, // Clear trial — they are now a paying customer
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (dbError) {
        console.error('[Stripe Webhook] checkout.session.completed DB update failed:', dbError)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      console.log(`[Stripe Webhook] User ${userId} activated → subscription_status = 'active'`)
      break
    }

    // ── Subscription updated (renewals, plan changes, payment failures) ────
    case 'customer.subscription.updated': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

      if (!customerId) {
        console.warn('[Stripe Webhook] customer.subscription.updated: missing customer id')
        return NextResponse.json({ received: true })
      }

      const stripeStatus = subscription.status
      const subscriptionStatus =
        stripeStatus === 'active' || stripeStatus === 'trialing'
          ? 'active'
          : stripeStatus === 'past_due'
            ? 'past_due'
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

      const { error: dbError } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('stripe_customer_id', customerId)

      if (dbError) {
        console.error('[Stripe Webhook] customer.subscription.updated DB update failed:', dbError)
      } else {
        console.log(`[Stripe Webhook] customer ${customerId} → status=${subscriptionStatus}`)
      }
      break
    }

    // ── Subscription deleted / canceled ────────────────────────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

      if (!customerId) {
        console.warn('[Stripe Webhook] customer.subscription.deleted: missing customer id')
        return NextResponse.json({ received: true })
      }

      const { error: dbError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId)

      if (dbError) {
        console.error('[Stripe Webhook] customer.subscription.deleted DB update failed:', dbError)
      } else {
        console.log(`[Stripe Webhook] customer ${customerId} → status='canceled'`)
      }
      break
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
      break
  }

  return NextResponse.json({ received: true })
}
