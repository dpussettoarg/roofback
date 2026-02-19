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

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object as import('stripe').Stripe.Checkout.Session

    const userId = session.client_reference_id
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

    if (!userId) {
      console.error('[Stripe Webhook] No client_reference_id in session')
      return NextResponse.json({ error: 'Missing user reference' }, { status: 400 })
    }

    let priceId: string | null = null
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        priceId = subscription.items.data[0]?.price?.id ?? null
      } catch {
        // Continue without price_id
      }
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        stripe_customer_id: customerId ?? null,
        subscription_status: 'active',
        subscription_price_id: priceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('[Stripe Webhook] Profile update failed:', error)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data?.object as import('stripe').Stripe.Subscription
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
    if (!customerId) return NextResponse.json({ received: true })

    const status = subscription.status
    const subscriptionStatus = status === 'active' || status === 'trialing' ? 'active' : 'canceled'

    const priceId = subscription.items.data[0]?.price?.id ?? null

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: subscriptionStatus,
        subscription_price_id: priceId,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) console.error('[Stripe Webhook] Subscription update failed:', error)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data?.object as import('stripe').Stripe.Subscription
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
    if (!customerId) return NextResponse.json({ received: true })

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) console.error('[Stripe Webhook] Subscription deletion update failed:', error)
  }

  return NextResponse.json({ received: true })
}
