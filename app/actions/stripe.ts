'use server'

import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getURL } from '@/lib/utils'

export async function createCheckoutSession(priceId: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { url: null, error: 'Unauthorized' }
  }

  if (!stripe) {
    return { url: null, error: 'Stripe is not configured' }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: getURL('/dashboard?success=true'),
      cancel_url: getURL('/dashboard?canceled=true'),
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
    })

    if (session.url) {
      return { url: session.url, error: null }
    }
    return { url: null, error: 'Failed to create checkout session' }
  } catch (err) {
    console.error('Stripe checkout error:', err)
    const msg = err instanceof Error ? err.message : 'Checkout failed'
    return { url: null, error: msg }
  }
}
