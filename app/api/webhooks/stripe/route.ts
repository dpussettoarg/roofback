import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  console.log('WEBHOOK_START')

  // ── Validate env vars ─────────────────────────────────────────────────────
  const stripeKey   = process.env.STRIPE_SECRET_KEY?.trim()
  const webhookSec  = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const sbUrl       = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const sbServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!stripeKey)    { console.error('MISSING_ENV: STRIPE_SECRET_KEY');          return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set' },          { status: 500 }) }
  if (!webhookSec)   { console.error('MISSING_ENV: STRIPE_WEBHOOK_SECRET');      return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not set' },       { status: 500 }) }
  if (!sbUrl)        { console.error('MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL');   return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL not set' },    { status: 500 }) }
  if (!sbServiceKey) { console.error('MISSING_ENV: SUPABASE_SERVICE_ROLE_KEY'); return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' },   { status: 500 }) }

  // ── Build clients fully inside the handler (no shared module that could be null) ──
  const stripe = new Stripe(stripeKey)

  // Admin client — uses service_role key to bypass RLS
  const supabaseAdmin = createClient(sbUrl, sbServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Read raw body BEFORE anything else ───────────────────────────────────
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature') ?? ''

  if (!sig) {
    console.error('MISSING_SIGNATURE')
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  // ── Verify signature ──────────────────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSec)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('SIGNATURE_FAILED:', msg)
    return NextResponse.json({ error: `Signature error: ${msg}` }, { status: 400 })
  }

  console.log('WEBHOOK_VERIFIED', event.type, event.id)

  // ── Event handling ────────────────────────────────────────────────────────
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      const userId = session.client_reference_id
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id ?? null
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription | null)?.id ?? null

      console.log('SESSION_DATA', { userId, customerId, subscriptionId })

      if (!userId) {
        console.error('MISSING_USER_ID_IN_SESSION', { sessionId: session.id })
        // 200 so Stripe doesn't retry forever — this is a data problem not a server error
        return NextResponse.json({ received: true, warning: 'MISSING_USER_ID_IN_SESSION' })
      }

      // Retrieve price_id (non-fatal)
      let priceId: string | null = null
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          priceId = sub.items.data[0]?.price?.id ?? null
        } catch (e) {
          console.warn('PRICE_ID_FETCH_FAILED', e instanceof Error ? e.message : e)
        }
      }

      console.log('Attempting DB update for user: ' + userId)

      try {
        const { error: dbErr } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status:  'active',
            trial_expires_at:     null,
            stripe_customer_id:   customerId,
            stripe_subscription_id: subscriptionId,
            price_id:             priceId,
            updated_at:           new Date().toISOString(),
          })
          .eq('id', userId)

        if (dbErr) throw new Error(dbErr.message + ' | code: ' + dbErr.code + ' | hint: ' + dbErr.hint)

        console.log('DB_UPDATE_SUCCESS user=' + userId + ' status=active')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('DB_UPDATE_ERROR:', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
      if (!customerId) break

      const status = sub.status === 'active' || sub.status === 'trialing' ? 'active'
        : sub.status === 'past_due' ? 'past_due' : 'canceled'
      const priceId = sub.items.data[0]?.price?.id ?? null
      const payload: Record<string, unknown> = {
        stripe_subscription_id: sub.id,
        subscription_status: status,
        price_id: priceId,
        updated_at: new Date().toISOString(),
      }
      if (status === 'active') payload.trial_expires_at = null

      console.log('Attempting DB update for customer: ' + customerId)
      try {
        const { error: dbErr } = await supabaseAdmin
          .from('profiles').update(payload).eq('stripe_customer_id', customerId)
        if (dbErr) throw new Error(dbErr.message + ' | code: ' + dbErr.code)
        console.log('DB_UPDATE_SUCCESS customer=' + customerId + ' status=' + status)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('DB_UPDATE_ERROR (sub.updated):', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
      if (!customerId) break

      console.log('Attempting DB update for customer: ' + customerId)
      try {
        const { error: dbErr } = await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'canceled', stripe_subscription_id: null, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        if (dbErr) throw new Error(dbErr.message + ' | code: ' + dbErr.code)
        console.log('DB_UPDATE_SUCCESS customer=' + customerId + ' status=canceled')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('DB_UPDATE_ERROR (sub.deleted):', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      break
    }

    default:
      console.log('UNHANDLED_EVENT', event.type)
  }

  return NextResponse.json({ received: true })
}
