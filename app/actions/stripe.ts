'use server'

import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getURL } from '@/lib/utils'

export async function createCheckoutSession(priceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', url: null }
  }

  if (!stripe) {
    return { error: 'Stripe is not configured', url: null }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: getURL('/dashboard?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: getURL('/settings'),
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
    })

    if (session.url) {
      return { url: session.url, error: null }
    }
    return { error: 'Failed to create checkout session', url: null }
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return {
      error: err instanceof Error ? err.message : 'Checkout failed',
      url: null,
    }
  }
}
