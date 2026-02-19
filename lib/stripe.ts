import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()

if (!stripeSecretKey) {
  console.warn(
    '[RoofBack] STRIPE_SECRET_KEY is not set. Stripe checkout and webhooks will not work.\n' +
    'Add it to .env.local (development) or Netlify environment variables (production).'
  )
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null
