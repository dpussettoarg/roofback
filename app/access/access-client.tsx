'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getURL } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Mail } from 'lucide-react'

export default function AccessClient() {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [processingHash, setProcessingHash] = useState(false)

  const router = useRouter()
  const { t, lang, setLang } = useI18n()
  const supabase = createClient()

  // Show toast if OAuth callback failed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'auth') {
      toast.error(
        lang === 'es'
          ? 'No se pudo completar el acceso con Google. Probá de nuevo o usá email y contraseña.'
          : "Couldn't complete Google sign-in. Try again or use email and password."
      )
      window.history.replaceState(null, '', '/access')
    }
  }, [lang])

  // Process Supabase hash (#access_token) — server never receives the hash
  useEffect(() => {
    if (processingHash) return
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return

    setProcessingHash(true)
    const run = async () => {
      try {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })
          if (!error) {
            window.history.replaceState(null, '', window.location.pathname)
            router.push('/dashboard')
            router.refresh()
            return
          }
        }
      } catch {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          window.history.replaceState(null, '', window.location.pathname)
          router.push('/dashboard')
          router.refresh()
        }
      }
      setProcessingHash(false)
    }
    run()
  }, [supabase, router, processingHash])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (view === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: getURL('/access'),
          },
        })
        if (error) throw error
        toast.success(
          lang === 'es'
            ? '¡Cuenta creada! Revisá tu email para confirmar.'
            : 'Account created! Check your email to confirm.'
        )
        return
      }

      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getURL('/auth/reset-password'),
        })
        if (error) throw error
        toast.success(
          lang === 'es'
            ? '¡Email enviado! Revisá tu bandeja de entrada.'
            : 'Email sent! Check your inbox.'
        )
        setView('login')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error(
            lang === 'es' ? 'Email o contraseña incorrectos' : 'Invalid email or password'
          )
        }
        throw error
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getURL('/auth/callback'),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
      setGoogleLoading(false)
    }
  }

  const isSignUp = view === 'signup'
  const isForgot = view === 'forgot'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-x-hidden"
      style={{ backgroundColor: '#0F1117' }}
    >
      {/* Background orbs */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,255,62,0.08) 0%, rgba(168,255,62,0.02) 60%, transparent 80%)' }}
      />
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,255,62,0.06) 0%, rgba(168,255,62,0.015) 60%, transparent 80%)' }}
      />

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
        className="absolute top-5 right-5 text-sm text-[#6B7280] hover:text-white border border-[#2A2D35] rounded-full px-3 py-1.5 transition-colors z-10"
      >
        {lang === 'es' ? 'EN' : 'ES'}
      </button>

      {/* Logo */}
      <div className="mb-8 relative z-10">
        <Image
          src="/LOGO/1.png"
          alt="RoofBack"
          width={280}
          height={80}
          priority
          className="h-14 w-auto"
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-[400px] relative z-10">
        <div
          className="rounded-2xl border border-[#2A2D35] p-8"
          style={{ backgroundColor: '#1E2228' }}
        >

          {/* ── FORGOT PASSWORD ── */}
          {isForgot && (
            <>
              <div className="mb-6 text-center">
                <div
                  className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(168,255,62,0.1)' }}
                >
                  <Mail className="h-5 w-5 text-[#A8FF3E]" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  {lang === 'es' ? 'Recuperar contraseña' : 'Reset password'}
                </h2>
                <p className="text-[#6B7280] text-sm mt-1">
                  {lang === 'es'
                    ? 'Te enviaremos un link para resetear tu contraseña'
                    : "We'll send you a link to reset your password"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email-forgot" className="block text-sm text-[#6B7280]">
                    Email
                  </label>
                  <input
                    id="email-forgot"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="input-dark w-full h-12 rounded-lg px-3 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-lime w-full h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading
                    ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                    : (lang === 'es' ? 'Enviar link de recuperación' : 'Send recovery link')}
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  onClick={() => setView('login')}
                  className="text-sm text-[#6B7280] hover:text-[#A8FF3E] transition-colors"
                >
                  {lang === 'es' ? '← Volver al login' : '← Back to login'}
                </button>
              </div>
            </>
          )}

          {/* ── LOGIN / SIGNUP ── */}
          {!isForgot && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {isSignUp ? t('auth.signup') : t('auth.login')}
                </h2>
                <p className="text-[#6B7280] text-sm mt-1">
                  {isSignUp
                    ? (lang === 'es' ? 'Es gratis. Sin tarjeta.' : "It's free. No card needed.")
                    : (lang === 'es' ? 'Ingresá con tu cuenta' : 'Sign in to your account')}
                </p>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full h-12 flex items-center justify-center gap-3 border border-[#2A2D35] rounded-lg text-sm font-medium text-white mb-5 hover:bg-[#252830] disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#1E2228' }}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {lang === 'es' ? 'Continuar con Google' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2A2D35]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 text-[#6B7280]" style={{ backgroundColor: '#1E2228' }}>
                    {lang === 'es' ? 'o con email' : 'or with email'}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <label htmlFor="fullname" className="block text-sm text-[#6B7280]">
                      {t('auth.name')}
                    </label>
                    <input
                      id="fullname"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Juan Pérez"
                      required
                      className="input-dark w-full h-12 rounded-lg px-3 text-sm"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm text-[#6B7280]">
                    {t('auth.email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="input-dark w-full h-12 rounded-lg px-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm text-[#6B7280]">
                      {t('auth.password')}
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-xs text-[#A8FF3E] hover:text-[#bdff72] transition-colors"
                      >
                        {lang === 'es' ? '¿Olvidaste tu clave?' : 'Forgot password?'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      required
                      className="input-dark w-full h-12 rounded-lg px-3 pr-12 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
                    >
                      {showPassword
                        ? <EyeOff className="h-5 w-5" />
                        : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-lime w-full h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading
                    ? (isSignUp ? t('auth.signingUp') : t('auth.loggingIn'))
                    : (isSignUp ? t('auth.signupBtn') : t('auth.loginBtn'))}
                </button>
              </form>

              {/* Legal */}
              <p className="mt-5 text-center text-xs text-[#9CA3AF] leading-relaxed px-1">
                {lang === 'es' ? (
                  <>
                    Al continuar, aceptás los{' '}
                    <Link href="/terms" target="_blank" className="text-[#A8FF3E] hover:text-[#bdff72] underline underline-offset-2 transition-colors">
                      Términos de Servicio
                    </Link>
                    {' '}y la{' '}
                    <Link href="/privacy" target="_blank" className="text-[#A8FF3E] hover:text-[#bdff72] underline underline-offset-2 transition-colors">
                      Política de Privacidad
                    </Link>
                    {' '}de RoofBack.
                  </>
                ) : (
                  <>
                    By continuing, you agree to RoofBack&apos;s{' '}
                    <Link href="/terms" target="_blank" className="text-[#A8FF3E] hover:text-[#bdff72] underline underline-offset-2 transition-colors">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" target="_blank" className="text-[#A8FF3E] hover:text-[#bdff72] underline underline-offset-2 transition-colors">
                      Privacy Policy
                    </Link>
                    .
                  </>
                )}
              </p>

              {/* Switch view */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView(isSignUp ? 'login' : 'signup')
                    setEmail('')
                    setPassword('')
                    setFullName('')
                  }}
                  className="text-sm text-[#6B7280] hover:text-[#A8FF3E] transition-colors"
                >
                  {isSignUp ? t('auth.switchToLogin') : t('auth.switchToSignup')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-[#6B7280] text-center relative z-10">
        © {new Date().getFullYear()} RoofBack ·{' '}
        <Link href="/terms" className="hover:text-[#A8FF3E] transition-colors">
          {lang === 'es' ? 'Términos' : 'Terms'}
        </Link>
        {' · '}
        <Link href="/privacy" className="hover:text-[#A8FF3E] transition-colors">
          {lang === 'es' ? 'Privacidad' : 'Privacy'}
        </Link>
        {' · '}
        <a href="mailto:hello@roofback.app" className="hover:text-[#A8FF3E] transition-colors">
          hello@roofback.app
        </a>
      </p>
    </div>
  )
}
