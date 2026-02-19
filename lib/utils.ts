import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the base URL for the current environment.
 * Used for Supabase Auth redirects (OAuth, magic link, password reset)
 * and Stripe success/cancel URLs.
 *
 * Priority (server-side):
 * 1. NEXT_PUBLIC_SITE_URL (set in production: https://roofback.app)
 * 2. VERCEL_URL (Vercel)
 * 3. URL (Netlify - custom domain or *.netlify.app)
 * 4. localhost for local dev
 */
export function getURL(path = ''): string {
  if (typeof window === 'undefined') {
    const base = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
      || process.env.URL
      || 'http://localhost:3000'
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : path ? `/${path}` : ''}`
  }
  return `${window.location.origin}${path.startsWith('/') ? path : path ? `/${path}` : ''}`
}
