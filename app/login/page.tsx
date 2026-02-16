'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Home } from 'lucide-react'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
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
        toast.success(lang === 'es' ? '¡Cuenta creada! Revisá tu email para confirmar.' : 'Account created! Check your email to confirm.')
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gray-50">
      <button
        onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
        className="absolute top-4 right-4 text-sm text-gray-500 hover:text-gray-800 bg-white border rounded-full px-3 py-1"
      >
        {lang === 'es' ? 'EN' : 'ES'}
      </button>

      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 mb-4">
          <Home className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">RoofBack</h1>
        <p className="text-gray-500 mt-1">{t('app.tagline')}</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{isSignUp ? t('auth.signup') : t('auth.login')}</CardTitle>
          <CardDescription>
            {isSignUp
              ? (lang === 'es' ? 'Es gratis. Sin tarjeta.' : 'It\'s free. No card needed.')
              : (lang === 'es' ? 'Entrá con tu email y contraseña' : 'Log in with your email and password')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="h-12 text-base"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 text-base"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            >
              {loading
                ? (isSignUp ? t('auth.signingUp') : t('auth.loggingIn'))
                : (isSignUp ? t('auth.signupBtn') : t('auth.loginBtn'))}
            </Button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-4 text-sm text-emerald-600 hover:text-emerald-800 text-center"
          >
            {isSignUp ? t('auth.switchToLogin') : t('auth.switchToSignup')}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
