import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BillingClient } from './billing-client'

export const metadata = {
  title: 'Billing',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://roofback.app/billing' },
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; success?: string; canceled?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_expires_at, stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  const params = await searchParams

  return (
    <BillingClient
      profile={profile}
      reason={params.reason}
      success={params.success === 'true'}
      canceled={params.canceled === 'true'}
    />
  )
}
