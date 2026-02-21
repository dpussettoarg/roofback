import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ── Inline admin client construction ─────────────────────────────────────────
// We intentionally avoid any shared module so there is zero risk of the client
// being null due to module-load-time env var timing issues.
function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Inline Stripe client construction ────────────────────────────────────────
function makeStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  // No explicit apiVersion — use the package default to avoid type mismatches
  return new Stripe(key)
}

export async function POST(request: NextRequest) {
  console.log('WEBHOOK_START')

  // ── 1. Validate env vars up-front ─────────────────────────────────────────
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    console.error('MISSING_ENV: STRIPE_WEBHOOK_SECRET is not set')
    return new Response(
      JSON.stringify({ error: 'STRIPE_WEBHOOK_SECRET is not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let stripeClient: Stripe
  try {
    stripeClient = makeStripeClient()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('MISSING_ENV:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 2. Read raw body (must happen before any other await) ─────────────────
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('MISSING_SIGNATURE: stripe-signature header not present')
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── 3. Verify Stripe webhook signature ────────────────────────────────────
  let event: Stripe.Event
  try {
    event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('SIGNATURE_FAILED:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log('WEBHOOK_SIGNATURE_VERIFIED', event.type, event.id)

  // ── 4. Handle events ──────────────────────────────────────────────────────
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // client_reference_id is set to user.id in app/actions/stripe.ts
      const userId = session.client_reference_id
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null

      console.log('SESSION_FIELDS', {
        userId,
        customerId,
        subscriptionId,
        mode: session.mode,
      })

      if (!userId) {
        console.error('MISSING_USER_ID_IN_SESSION', {
          sessionId: session.id,
          hint: 'createCheckoutSession() must pass client_reference_id: user.id',
        })
        // Return 200 so Stripe does not endlessly retry — this is a data problem
        return new Response(
          JSON.stringify({ received: true, warning: 'MISSING_USER_ID_IN_SESSION' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Resolve price_id (non-fatal)
      let priceId: string | null = null
      if (subscriptionId) {
        try {
          const sub = await stripeClient.subscriptions.retrieve(subscriptionId)
          priceId = sub.items.data[0]?.price?.id ?? null
        } catch (err) {
          console.warn('PRICE_ID_FETCH_FAILED', err instanceof Error ? err.message : err)
        }
      }

      console.log('DB_UPDATE_ATTEMPT', userId)

      // ── DB update wrapped in try/catch so the real error reaches Stripe ──
      try {
        const db = makeAdminClient()

        const { error: dbError, data } = await db
          .from('profiles')
          .update({
            subscription_status: 'active',
            trial_expires_at: null,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            price_id: priceId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select('id, subscription_status')

        if (dbError) {
          // Throw so the outer catch returns 500 with the real Supabase error
          throw new Error(
            `Supabase update failed: ${dbError.message} (code=${dbError.code}, hint=${dbError.hint})`
          )
        }

        console.log('DB_UPDATE_SUCCESS', { userId, rowsReturned: data?.length, data })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('DB_UPDATE_ERROR', msg)
        return new Response(JSON.stringify({ error: msg }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

      if (!customerId) {
        console.warn('SUBSCRIPTION_UPDATED_NO_CUSTOMER_ID')
        break
      }

      const stripeStatus = subscription.status
      const subscriptionStatus =
        stripeStatus === 'active' || stripeStatus === 'trialing' ? 'active'
          : stripeStatus === 'past_due' ? 'past_due'
            : 'canceled'

      const priceId = subscription.items.data[0]?.price?.id ?? null
      const payload: Record<string, unknown> = {
        stripe_subscription_id: subscription.id,
        subscription_status: subscriptionStatus,
        price_id: priceId,
        updated_at: new Date().toISOString(),
      }
      if (subscriptionStatus === 'active') payload.trial_expires_at = null

      console.log('DB_UPDATE_ATTEMPT (subscription.updated)', customerId)

      try {
        const db = makeAdminClient()
        const { error: dbError } = await db
          .from('profiles')
          .update(payload)
          .eq('stripe_customer_id', customerId)

        if (dbError) throw new Error(`${dbError.message} (code=${dbError.code})`)
        console.log('DB_UPDATE_SUCCESS (subscription.updated)', { customerId, subscriptionStatus })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('DB_UPDATE_ERROR (subscription.updated)', msg)
        return new Response(JSON.stringify({ error: msg }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

      if (!customerId) {
        console.warn('SUBSCRIPTION_DELETED_NO_CUSTOMER_ID')
        break
      }

      console.log('DB_UPDATE_ATTEMPT (subscription.deleted)', customerId)

      try {
        const db = makeAdminClient()
        const { error: dbError } = await db
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (dbError) throw new Error(`${dbError.message} (code=${dbError.code})`)
        console.log('DB_UPDATE_SUCCESS (subscription.deleted)', { customerId })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('DB_UPDATE_ERROR (subscription.deleted)', msg)
        return new Response(JSON.stringify({ error: msg }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      break
    }

    default:
      console.log('WEBHOOK_UNHANDLED_EVENT', event.type)
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
