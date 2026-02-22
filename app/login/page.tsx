import type { Metadata } from 'next'
import LoginClient from './login-client'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Sign in to RoofBack — the roofing management app built by roofers, for roofers.',
  alternates: { canonical: 'https://roofback.app/login' },
  // Don't index the login page — avoids thin-content penalties
  robots: { index: false, follow: true },
}

export default function LoginPage() {
  return <LoginClient />
}
