import type { Metadata } from 'next'
import LoginClient from './login-client'

export const metadata: Metadata = {
  title: 'Log In | RoofBack',
  description: 'Sign in to RoofBack — the roofing management app built by roofers, for roofers.',
  alternates: { canonical: 'https://roofback.app/login' },
  robots: { index: false, follow: true },
}

export default function LoginPage() {
  return <LoginClient />
}
