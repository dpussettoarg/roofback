'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t, lang, setLang } = useI18n()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        toast.success(
          lang === 'es'
            ? '¡Cuenta creada! Revisá tu email para confirmar.'
            : 'Account created! Check your email to confirm.'
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-white relative overflow-hidden">
      {/* Subtle background gradient orb */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-brand-subtle opacity-60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-brand-subtle opacity-40 blur-3xl pointer-events-none" />

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
        className="absolute top-5 right-5 text-sm text-slate-400 hover:text-slate-700 border border-slate-200 rounded-full px-3 py-1.5 transition-colors z-10"
      >
        {lang === 'es' ? 'EN' : 'ES'}
      </button>

      {/* Logo - language-aware */}
      <div className="mb-10 text-center relative z-10">
        <div className="flex items-center justify-center">
          <Image
            src={lang === 'es' ? '/LOGO/3.png' : '/LOGO/4.png'}
            alt="RoofBack"
            width={280}
            height={80}
            priority
            className="h-16 w-auto"
          />
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm relative z-10">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-8">
          {/* Title */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              {isSignUp ? t('auth.signup') : t('auth.login')}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isSignUp
                ? lang === 'es'
                  ? 'Es gratis. Sin tarjeta.'
                  : "It's free. No card needed."
                : lang === 'es'
                  ? 'Ingresá con tu email y contraseña'
                  : 'Log in with your email and password'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name (sign up only) */}
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
                  className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl focus:border-[#008B99] focus:ring-[#008B99]/20 transition-colors"
                  required
                />
              </div>
            )}

            {/* Email */}
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
                className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl focus:border-[#008B99] focus:ring-[#008B99]/20 transition-colors"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-600 text-sm font-medium">
                {t('auth.password')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl focus:border-[#008B99] focus:ring-[#008B99]/20 transition-colors pr-12"
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

            {/* Submit Button with Gradient */}
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

          {/* Toggle Sign Up / Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-slate-500 hover:text-[#008B99] transition-colors"
            >
              {isSignUp ? t('auth.switchToLogin') : t('auth.switchToSignup')}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-slate-400 text-center relative z-10 max-w-xs">
        {lang === 'es'
          ? 'Respaldado por 20 años de experiencia en roofing.'
          : 'Backed by 20 years of roofing expertise.'}
      </p>
    </div>
  )
}
