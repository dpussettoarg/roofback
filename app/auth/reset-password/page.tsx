'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match / Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters / Mínimo 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated! / ¡Contraseña actualizada!')
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-white relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-brand-subtle opacity-60 blur-3xl pointer-events-none" />

      <div className="mb-8 text-center relative z-10">
        <Image src="/LOGO/3.png" alt="RoofBack" width={200} height={56} className="h-12 w-auto mx-auto" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-brand-subtle">
            <Lock className="h-5 w-5 text-[#008B99]" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 text-center">
            Nueva contraseña
          </h2>
          <p className="text-slate-500 text-sm mt-1 text-center mb-6">
            Set your new password / Establecé tu nueva contraseña
          </p>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm font-medium">New password / Nueva contraseña</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl pr-12"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 text-sm font-medium">Confirm / Confirmar</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
                minLength={6}
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
                  Updating...
                </span>
              ) : (
                'Update password / Actualizar'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
