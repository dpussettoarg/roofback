import type { Metadata } from 'next'
import AccessClient from './access-client'

export const metadata: Metadata = {
  title: 'Log In | RoofBack',
  description: 'Sign in to RoofBack — the roofing management app built by roofers, for roofers.',
  alternates: { canonical: 'https://roofback.app/access' },
  robots: { index: false, follow: true },
}

export default function AccessPage() {
  return <AccessClient />
}
