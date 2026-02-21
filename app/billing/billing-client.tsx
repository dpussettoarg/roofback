'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createCheckoutSession } from '@/app/actions/stripe'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  CheckCircle, AlertTriangle, Clock, Zap, Loader2,
  ArrowLeft, Shield, Infinity, Headphones, LogOut, Home,
} from 'lucide-react'

interface BillingClientProps {
  profile: {
    subscription_status: string
    trial_expires_at: string | null
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
  } | null
  reason?: string
  success?: boolean
  canceled?: boolean
}

const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1T2ODTBiIxuQmwGuua83OmC0'

const FEATURES = [
  'Unlimited estimates & proposals',
  'AI proposal generator',
  'Digital signature & client approval',
  'Budget vs Actual tracker',
  'Photo uploads with compression',
  'Material & time tracking',
  'PDF export',
  'Priority support',
]

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function BillingClient({ profile, reason, success, canceled }: BillingClientProps) {
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    // Hard redirect to home — clears all client state and cookies
    window.location.href = '/'
  }

  // NOTE: when success=true, the server-rendered profile may still show
  // 'trialing' because the Stripe webhook hasn't fired yet. We treat
  // success=true as the authoritative source of truth for the UI.
  const effectivelyActive = success || profile?.subscription_status === 'active'

  const status = profile?.subscription_status ?? 'trialing'
  const isActive = effectivelyActive
  const isTrialing = !effectivelyActive && status === 'trialing'
  const isCanceled = !effectivelyActive && status === 'canceled'
  const isPastDue = !effectivelyActive && status === 'past_due'

  const daysLeft = isTrialing ? getDaysLeft(profile?.trial_expires_at ?? null) : null
  const trialExpired = isTrialing && daysLeft !== null && daysLeft <= 0
  const trialExpiredByReason = !success && reason === 'trial_expired'

  async function handleUpgrade() {
    setLoading(true)
    try {
      const { url, error } = await createCheckoutSession(PRICE_ID)
      if (error) {
        toast.error(error)
        return
      }
      if (url) {
        window.location.href = url
      }
    } catch {
      toast.error('Could not start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── SUCCESS SCREEN — shown immediately after Stripe redirects back ─────────
  // This takes over the entire page so stale profile data is never visible.
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#0F1117' }}>
        <div className="max-w-sm w-full text-center space-y-6">
          {/* Big green checkmark */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-[#A8FF3E]" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">¡Suscripción Activada!</h1>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">
              Tu cuenta ha sido actualizada a RoofBack Pro.<br />
              Ya tenés acceso completo a todas las funciones.
            </p>
          </div>

          {/* "Go to dashboard" — uses window.location.href for a hard reload
              so the middleware sees the updated subscription_status */}
          <button
            onClick={() => { window.location.href = '/jobs' }}
            className="btn-lime w-full h-13 rounded-xl font-bold text-base flex items-center justify-center gap-2 py-3.5"
          >
            <Zap className="h-5 w-5" />
            Ir al Dashboard
          </button>

          <p className="text-[11px] text-[#4B5563]">
            ¿Preguntas?{' '}
            <a href="mailto:hello@roofback.app" className="underline hover:text-[#A8FF3E] transition-colors">
              hello@roofback.app
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-lg mx-auto px-6 py-10">

        {/* ── Top nav row: back (active users) + sign-out (always) ─────────── */}
        <div className="flex items-center justify-between mb-8">
          {isActive ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-white transition-colors"
            >
              <Home className="h-4 w-4" />
              Volver al Inicio
            </Link>
          )}

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Cerrar Sesión
          </button>
        </div>

        {/* ── Canceled checkout banner ─────────────────────────────────────── */}
        {canceled && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-sm">Checkout was canceled. You have not been charged.</p>
          </div>
        )}

        {/* ── Trial expired warning (redirected from middleware) ───────────── */}
        {(trialExpiredByReason || (isTrialing && trialExpired)) && (
          <div className="mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="font-bold text-red-300 text-base">Your free trial has expired</p>
            </div>
            <p className="text-red-400/80 text-sm leading-relaxed">
              Your 14-day free trial has ended. Upgrade to continue accessing your jobs,
              estimates, and client proposals.
            </p>
          </div>
        )}

        {/* ── Canceled subscription warning ────────────────────────────────── */}
        {(isCanceled || reason === 'canceled') && (
          <div className="mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="font-bold text-red-300 text-base">Subscription canceled</p>
            </div>
            <p className="text-red-400/80 text-sm">
              Your subscription is no longer active. Resubscribe to regain full access.
            </p>
          </div>
        )}

        {/* ── Status card ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#1E2228', border: '1px solid #2A2D35' }}>
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
            Current Plan
          </p>

          {isActive ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-[#A8FF3E]" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">RoofBack Pro</p>
                <p className="text-[#A8FF3E] text-sm font-medium">Active subscription</p>
              </div>
            </div>
          ) : isTrialing && !trialExpired ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Free Trial</p>
                <p className={`text-sm font-medium ${(daysLeft ?? 0) <= 3 ? 'text-red-400' : 'text-amber-400'}`}>
                  {daysLeft !== null && daysLeft > 0
                    ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`
                    : 'Expires today'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">
                  {isCanceled ? 'Canceled' : 'Trial Expired'}
                </p>
                <p className="text-red-400 text-sm font-medium">Upgrade required</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Pricing card (shown when not active) ────────────────────────── */}
        {!isActive && (
          <div
            className="rounded-2xl overflow-hidden mb-6 ring-2 ring-[#A8FF3E]/30"
            style={{ backgroundColor: '#16191F', border: '1px solid #2A2D35' }}
          >
            {/* Top accent */}
            <div className="h-1 bg-[#A8FF3E]" />

            <div className="p-6 space-y-5">
              {/* Price header */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A8FF3E]/10 text-[#A8FF3E] text-xs font-semibold mb-3">
                  <Zap className="h-3 w-3" />
                  RoofBack Pro
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$29</span>
                  <span className="text-[#6B7280] text-sm">/month</span>
                </div>
                <p className="text-[#6B7280] text-xs mt-1">
                  Cancel anytime · No long-term contract
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#9CA3AF]">
                    <CheckCircle className="h-4 w-4 text-[#A8FF3E] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="btn-lime w-full h-13 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 py-3.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Upgrade to Pro — $29/mo
                  </>
                )}
              </button>

              <p className="text-[11px] text-[#4B5563] text-center">
                Secure payment via Stripe. You won&apos;t be charged until you enter your card details.
              </p>
            </div>
          </div>
        )}

        {/* ── Escape hatch for non-active users ───────────────────────────── */}
        {!isActive && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Cerrar Sesión
            </button>
          </div>
        )}

        {/* ── Trust badges ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Shield, label: 'Secure\nPayments' },
            { icon: Infinity, label: 'Cancel\nAnytime' },
            { icon: Headphones, label: 'Priority\nSupport' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: '#1E2228', border: '1px solid #2A2D35' }}
            >
              <Icon className="h-4 w-4 text-[#A8FF3E] mx-auto mb-1" />
              <p className="text-[10px] text-[#6B7280] whitespace-pre-line leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Active subscription management ──────────────────────────────── */}
        {isActive && !isPastDue && (
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#1E2228', border: '1px solid #2A2D35' }}>
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
              Manage Subscription
            </p>
            <p className="text-[#9CA3AF] text-sm mb-4">
              To update your payment method, change your plan, or cancel, use the Stripe customer portal.
            </p>
            <a
              href="https://billing.stripe.com/p/login/test_eVqdR861Ce7rbGl0I9ew800"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#A8FF3E] hover:text-white transition-colors underline underline-offset-4"
            >
              Open billing portal →
            </a>
          </div>
        )}

        {/* Past due warning */}
        {isPastDue && (
          <div className="rounded-2xl p-5 bg-amber-500/10 border border-amber-500/30">
            <p className="font-semibold text-amber-300 text-sm mb-1">Payment failed</p>
            <p className="text-amber-400/80 text-xs mb-3">
              We couldn&apos;t process your last payment. Please update your payment method to keep access.
            </p>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="btn-lime w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Payment Method'}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-[#4B5563]">
          Questions?{' '}
          <a href="mailto:hello@roofback.app" className="underline hover:text-[#A8FF3E] transition-colors">
            hello@roofback.app
          </a>
        </p>

      </div>
    </div>
  )
}
