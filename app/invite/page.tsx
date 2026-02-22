'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

type State = 'loading' | 'needs_login' | 'accepting' | 'success' | 'error'

export default function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lang } = useI18n()
  const supabase = createClient()
  const token = searchParams.get('token')

  const [state, setState] = useState<State>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [orgName, setOrgName] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setErrorMsg('Missing token'); return }
    checkAndAccept()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function checkAndAccept() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to login, preserving token in return URL
      router.push(`/login?next=/invite?token=${token}`)
      return
    }

    setState('accepting')

    // Call the SECURITY DEFINER RPC
    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })

    if (error) {
      setState('error')
      setErrorMsg(error.message)
      return
    }

    const result = data as { error?: string; success?: boolean; organization_id?: string; role?: string }

    if (result.error) {
      setState('error')
      setErrorMsg(result.error)
      return
    }

    // Fetch org name for display
    if (result.organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', result.organization_id)
        .single()
      setOrgName(orgData?.name || 'your organization')
    }
    setRole(result.role || 'ops')
    setState('success')

    // Redirect after a short delay
    setTimeout(() => router.push('/dashboard'), 3000)
  }

  const roleLabel = role === 'owner'
    ? (lang === 'es' ? 'Propietario' : 'Owner')
    : (lang === 'es' ? 'Operaciones' : 'Operations')

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <Image src="/logo.png" alt="RoofBack" width={140} height={42} />
        </div>

        {(state === 'loading' || state === 'accepting') && (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-8 space-y-4">
            <Loader2 className="h-10 w-10 text-[#A8FF3E] animate-spin mx-auto" />
            <p className="text-white font-semibold">
              {lang === 'es' ? 'Procesando invitación...' : 'Processing invitation...'}
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="bg-[#1E2228] border border-[#A8FF3E]/30 rounded-2xl p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-[#A8FF3E]" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {lang === 'es' ? '¡Bienvenido al equipo!' : 'Welcome to the team!'}
            </h2>
            <p className="text-[#9CA3AF] text-sm">
              {lang === 'es'
                ? `Te uniste a ${orgName} como ${roleLabel}. Redirigiendo al dashboard...`
                : `You've joined ${orgName} as ${roleLabel}. Redirecting to dashboard...`}
            </p>
            <Link href="/dashboard">
              <button className="w-full h-12 rounded-xl bg-[#A8FF3E] text-[#0F1117] font-bold text-sm mt-2">
                {lang === 'es' ? 'Ir al Dashboard' : 'Go to Dashboard'}
              </button>
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-[#1E2228] border border-red-500/30 rounded-2xl p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {lang === 'es' ? 'Invitación inválida' : 'Invalid invitation'}
            </h2>
            <p className="text-[#9CA3AF] text-sm">{errorMsg}</p>
            <Link href="/dashboard">
              <button className="w-full h-12 rounded-xl border border-[#2A2D35] bg-transparent text-[#6B7280] text-sm mt-2 hover:bg-[#252830]">
                {lang === 'es' ? 'Volver al inicio' : 'Back to home'}
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
