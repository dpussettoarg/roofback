'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
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
    <div className="flex min-h-screen flex-col items-center justify-center px-6 relative overflow-hidden" style={{ backgroundColor: '#0F1117' }}>
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,255,62,0.3), transparent)' }} />

      <div className="mb-8 text-center relative z-10">
        <Image src="/LOGO/1.png" alt="RoofBack" width={200} height={56} className="h-12 w-auto mx-auto" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-2xl border p-8" style={{ backgroundColor: '#1E2228', borderColor: '#2A2D35' }}>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full" style={{ backgroundColor: 'rgba(168,255,62,0.1)' }}>
            <Lock className="h-5 w-5 text-[#A8FF3E]" />
          </div>
          <h2 className="text-xl font-semibold text-white text-center">
            Nueva contraseña
          </h2>
          <p className="text-[#6B7280] text-sm mt-1 text-center mb-6">
            Set your new password / Establecé tu nueva contraseña
          </p>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[#6B7280] text-sm">New password / Nueva contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark h-12 rounded-lg pr-12"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[#6B7280] text-sm">Confirm / Confirmar</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark h-12 rounded-lg"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-bold rounded-lg btn-lime flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update password / Actualizar'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
