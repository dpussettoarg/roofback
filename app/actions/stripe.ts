'use server'

import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getURL } from '@/lib/utils'

export async function createCheckoutSession(
  priceId: string
): Promise<{ url: string | null; error: string | null }> {
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
    // Look up existing Stripe customer so we don't create duplicates
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const existingCustomerId = profile?.stripe_customer_id ?? undefined

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the Stripe customer if they already exist, otherwise create via email
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: user.email ?? undefined }),
      success_url: getURL('/billing?success=true'),
      cancel_url: getURL('/billing?canceled=true'),
      // Carry the Supabase user ID so the webhook can identify the user
      client_reference_id: user.id,
      // 30-day trial at the Stripe level as a safety net
      subscription_data: {
        trial_period_days: 0, // Trial is managed in our DB, not Stripe
        metadata: { supabase_user_id: user.id },
      },
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
