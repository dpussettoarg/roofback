'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getURL } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Mail } from 'lucide-react'

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const { t, lang, setLang } = useI18n()
  const supabase = createClient()

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
            emailRedirectTo: getURL('/auth/callback'),
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

      // Login
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid API key')) {
          throw new Error(
            lang === 'es'
              ? 'Error de configuración. Verificá las credenciales de Supabase en .env.local'
              : 'Configuration error. Check Supabase credentials in .env.local'
          )
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error(
            lang === 'es'
              ? 'Email o contraseña incorrectos'
              : 'Invalid email or password'
          )
        }
        throw error
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error')
      toast.error(message)
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
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) {
        if (error.message.includes('Invalid API key')) {
          throw new Error(
            lang === 'es'
              ? 'Error de configuración. Verificá las credenciales de Supabase.'
              : 'Configuration error. Check Supabase credentials.'
          )
        }
        throw error
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error')
      toast.error(message)
      setGoogleLoading(false)
    }
  }

  const isSignUp = view === 'signup'
  const isForgot = view === 'forgot'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-white relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-brand-subtle opacity-60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-brand-subtle opacity-40 blur-3xl pointer-events-none" />

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
        className="absolute top-5 right-5 text-sm text-slate-400 hover:text-slate-700 border border-slate-200 rounded-full px-3 py-1.5 transition-colors z-10"
      >
        {lang === 'es' ? 'EN' : 'ES'}
      </button>

      {/* Logo */}
      <div className="mb-8 text-center relative z-10">
        <div className="flex items-center justify-center">
          <Image
            src={lang === 'es' ? '/LOGO/3.png' : '/LOGO/4.png'}
            alt="RoofBack"
            width={280}
            height={80}
            priority
            className="h-14 w-auto"
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative z-10">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-8">

          {/* ===== FORGOT PASSWORD VIEW ===== */}
          {isForgot && (
            <>
              <div className="mb-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-brand-subtle">
                  <Mail className="h-5 w-5 text-[#008B99]" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {lang === 'es' ? 'Recuperar contraseña' : 'Reset password'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {lang === 'es'
                    ? 'Te enviaremos un link para resetear tu contraseña'
                    : "We'll send you a link to reset your password"}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-forgot" className="text-slate-600 text-sm font-medium">Email</Label>
                  <Input
                    id="email-forgot"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl focus:border-[#008B99] focus:ring-[#008B99]/20"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-medium rounded-xl btn-gradient"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {lang === 'es' ? 'Enviando...' : 'Sending...'}
                    </span>
                  ) : (
                    lang === 'es' ? 'Enviar link de recuperación' : 'Send recovery link'
                  )}
                </Button>
              </form>
              <div className="mt-5 text-center">
                <button
                  onClick={() => setView('login')}
                  className="text-sm text-slate-500 hover:text-[#008B99] transition-colors"
                >
                  {lang === 'es' ? '← Volver al login' : '← Back to login'}
                </button>
              </div>
            </>
          )}

          {/* ===== LOGIN / SIGNUP VIEW ===== */}
          {!isForgot && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  {isSignUp ? t('auth.signup') : t('auth.login')}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {isSignUp
                    ? lang === 'es' ? 'Es gratis. Sin tarjeta.' : "It's free. No card needed."
                    : lang === 'es' ? 'Ingresá con tu cuenta' : 'Sign in to your account'}
                </p>
              </div>

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full h-12 flex items-center justify-center gap-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 mb-5 disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {lang === 'es' ? 'Continuar con Google' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">
                    {lang === 'es' ? 'o con email' : 'or with email'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-600 text-sm font-medium">
                      {t('auth.name')}
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Juan Pérez"
                      className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl focus:border-[#008B99] focus:ring-[#008B99]/20"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-600 text-sm font-medium">
                    {t('auth.email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl focus:border-[#008B99] focus:ring-[#008B99]/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-600 text-sm font-medium">
                      {t('auth.password')}
                    </Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-xs text-[#008B99] hover:text-[#006d78] transition-colors"
                      >
                        {lang === 'es' ? '¿Olvidaste tu clave?' : 'Forgot password?'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl focus:border-[#008B99] focus:ring-[#008B99]/20 pr-12"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-medium rounded-xl btn-gradient"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isSignUp ? t('auth.signingUp') : t('auth.loggingIn')}
                    </span>
                  ) : (
                    isSignUp ? t('auth.signupBtn') : t('auth.loginBtn')
                  )}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <button
                  onClick={() => setView(isSignUp ? 'login' : 'signup')}
                  className="text-sm text-slate-500 hover:text-[#008B99] transition-colors"
                >
                  {isSignUp ? t('auth.switchToLogin') : t('auth.switchToSignup')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-slate-400 text-center relative z-10 max-w-xs">
        {lang === 'es'
          ? 'Respaldado por 20 años de experiencia en roofing.'
          : 'Backed by 20 years of roofing expertise.'}
      </p>
    </div>
  )
}
