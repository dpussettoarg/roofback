import type { Metadata } from 'next'
import LoginClient from './login-client'

// Force dynamic rendering so Netlify never ISR-caches this page.
// Without this, Netlify serves stale HTML with old chunk hashes after each deploy.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Log In | RoofBack',
  description: 'Sign in to RoofBack — the roofing management app built by roofers, for roofers.',
  alternates: { canonical: 'https://roofback.app/login' },
  robots: { index: false, follow: true },
}

export default function LoginPage() {
  return <LoginClient />
}
