import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

export async function POST(request: NextRequest) {
  if (!stripe || !supabaseAdmin || !webhookSecret) {
    console.error('[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET, stripe, or supabaseAdmin')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: import('stripe').Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    console.error('[Stripe Webhook] Signature verification failed:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  switch (event.type) {

    // ── New subscription created via Checkout ──────────────────────────────
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
        console.error('[Stripe Webhook] No client_reference_id in session')
        return NextResponse.json({ error: 'Missing user reference' }, { status: 400 })
      }

      let priceId: string | null = null
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          priceId = sub.items.data[0]?.price?.id ?? null
        } catch {
          // Non-fatal — price_id is informational
        }
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          subscription_status: 'active',
          price_id: priceId,
          // Clear trial expiry — they are now a paying customer
          trial_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error('[Stripe Webhook] Profile update failed:', error)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }
      break
    }

    // ── Subscription changed (renewal, upgrade, downgrade, payment failure) ─
    case 'customer.subscription.updated': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id
      if (!customerId) return NextResponse.json({ received: true })

      const stripeStatus = subscription.status
      // Map Stripe statuses to our simplified internal statuses
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

      // If it became active, ensure trial_expires_at is cleared
      if (subscriptionStatus === 'active') {
        updatePayload.trial_expires_at = null
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('stripe_customer_id', customerId)

      if (error) console.error('[Stripe Webhook] Subscription update failed:', error)
      break
    }

    // ── Subscription canceled / deleted ────────────────────────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id
      if (!customerId) return NextResponse.json({ received: true })

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId)

      if (error) console.error('[Stripe Webhook] Subscription deletion update failed:', error)
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
