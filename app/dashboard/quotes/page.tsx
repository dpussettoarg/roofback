'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { useProfile } from '@/lib/hooks/useProfile'
import { MobileNav } from '@/components/app/mobile-nav'
import { AppHeader } from '@/components/app/app-header'
import { ArrowLeft, Plus, ChevronRight, FileText, Send, Clock } from 'lucide-react'
import { formatJobNumber } from '@/lib/types'
import type { Job } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function jobIsQuotation(job: Job) {
  if (job.status === 'completed') return false
  if (job.client_status === 'approved') return false
  if (job.status === 'in_progress') return false
  return true
}

function SentBadge({ lang }: { lang: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
      <Send className="h-2.5 w-2.5" />
      {lang === 'es' ? 'Enviado' : 'Sent'}
    </span>
  )
}

function DraftBadge({ lang }: { lang: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#4B5563]/20 text-[#9CA3AF]">
      <Clock className="h-2.5 w-2.5" />
      {lang === 'es' ? 'Borrador' : 'Draft'}
    </span>
  )
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const { lang } = useI18n()
  const { profile, canSeeFinancials } = useProfile()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      const orgId = prof?.organization_id

      let q = supabase
        .from('jobs')
        .select('*')
        // Exclude approved / in_progress / completed
        .not('client_status', 'eq', 'approved')
        .not('status', 'eq', 'in_progress')
        .not('status', 'eq', 'completed')
        .order('created_at', { ascending: false })

      if (orgId) {
        q = q.eq('organization_id', orgId)
      } else {
        q = q.eq('user_id', user.id)
      }

      const { data } = await q
      setQuotes(((data as Job[]) || []).filter(jobIsQuotation))
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] pb-24">
        <div className="max-w-[430px] mx-auto px-5 pt-14 space-y-3">
          <div className="skeleton h-8 w-40 mb-4" />
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
        <AppHeader />
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div className="px-5 pt-12 pb-4">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-[#6B7280] mb-3 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {lang === 'es' ? 'Dashboard' : 'Dashboard'}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {lang === 'es' ? 'Cotizaciones' : 'Quotations'}
              </h1>
              <p className="text-sm text-[#6B7280] mt-0.5">
                {quotes.length} {lang === 'es' ? 'abierta(s)' : 'open'}
              </p>
            </div>
            <Link href="/jobs/new">
              <button className="h-9 px-4 text-sm font-bold rounded-lg btn-lime flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                {lang === 'es' ? 'Nueva' : 'New'}
              </button>
            </Link>
          </div>
        </div>

        {/* List */}
        <div className="px-5 space-y-2">
          {quotes.length === 0 ? (
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-10 text-center mt-2">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#A8FF3E]" />
              </div>
              <p className="text-white font-semibold mb-1">
                {lang === 'es' ? 'Sin cotizaciones abiertas' : 'No open quotations'}
              </p>
              <p className="text-sm text-[#6B7280] mb-4">
                {lang === 'es' ? 'Crea tu primera cotización para un cliente.' : 'Create your first client quotation.'}
              </p>
              <Link href="/jobs/new">
                <button className="h-10 px-6 text-sm font-bold rounded-lg btn-lime">
                  <Plus className="h-4 w-4 mr-1 inline" />
                  {lang === 'es' ? 'Crear presupuesto' : 'Create estimate'}
                </button>
              </Link>
            </div>
          ) : (
            quotes.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 flex items-center justify-between hover:border-[#3A3D45] transition-colors border-l-4 border-l-[#4B5563]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {job.job_number && (
                        <span className="text-[10px] font-mono font-bold text-[#A8FF3E] bg-[#A8FF3E]/10 px-1.5 py-0.5 rounded">
                          {formatJobNumber(job.job_number)}
                        </span>
                      )}
                      <p className="font-semibold text-white truncate">{job.client_name}</p>
                    </div>
                    <p className="text-xs text-[#6B7280] truncate">{job.client_address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {job.workflow_stage === 'sent'
                        ? <SentBadge lang={lang} />
                        : <DraftBadge lang={lang} />}
                      <span className="text-[11px] text-[#4B5563]">{fmtDate(job.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {canSeeFinancials && Number(job.estimated_total) > 0 && (
                      <span className="text-sm font-bold text-white tabular-nums">
                        {formatMoney(Number(job.estimated_total))}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-[#6B7280]" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <AppHeader />
      <MobileNav />
    </div>
  )
}
