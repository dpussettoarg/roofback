import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Public routes (no auth required) ──────────────────────────────────────
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/proposal') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/api/webhooks/stripe') ||
    pathname.startsWith('/debug')

  // Billing/pricing pages are always accessible to authenticated users
  // so they can upgrade even after trial expires
  const isBillingRoute =
    pathname.startsWith('/billing') ||
    pathname.startsWith('/pricing')

  // ── OAuth code forwarding ──────────────────────────────────────────────────
  const code = request.nextUrl.searchParams.get('code')
  if (!user && code && (pathname === '/' || pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  // ── Unauthenticated → login ────────────────────────────────────────────────
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Authenticated + /login → dashboard ────────────────────────────────────
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Root → dashboard (only when trial is not expired, handled below) ────────
  // We intentionally don't redirect here for expired-trial users so they can
  // reach / to read the landing page or click "Sign out".

  // ── Trial-expiry bouncer (only for protected non-billing routes) ───────────
  // Exemptions: public routes, billing/pricing, AND the root path + auth routes
  // so an expired-trial user can always sign out or navigate to the home page.
  const isEscapeRoute = pathname === '/' || pathname.startsWith('/auth')

  if (user && !isPublicRoute && !isBillingRoute && !isEscapeRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, trial_expires_at')
      .eq('id', user.id)
      .single()

    if (profile) {
      const isTrialing = profile.subscription_status === 'trialing'
      const isActive = profile.subscription_status === 'active'
      const trialExpired =
        isTrialing &&
        profile.trial_expires_at &&
        new Date(profile.trial_expires_at) < new Date()

      const isCanceled = profile.subscription_status === 'canceled'

      if (!isActive && (trialExpired || isCanceled)) {
        const url = request.nextUrl.clone()
        url.pathname = '/billing'
        url.searchParams.set('reason', trialExpired ? 'trial_expired' : 'canceled')
        return NextResponse.redirect(url)
      }
    }
  }

  // ── Root → dashboard (active/trialing users only — expired users stay on /) ─
  if (user && pathname === '/') {
    // If we reach here, the user is not expired (bouncer above would have redirected)
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|.*\\.png$).*)',
  ],
}
