'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { useProfile } from '@/lib/hooks/useProfile'
import { MobileNav } from '@/components/app/mobile-nav'
import { AppHeader } from '@/components/app/app-header'
import { Plus, ChevronRight, Search, Hammer, FileText, HardHat, CheckCircle2 } from 'lucide-react'
import { JOB_TYPE_OPTIONS } from '@/lib/templates'
import { formatJobNumber } from '@/lib/types'
import type { Job } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

type Tab = 'leads' | 'active' | 'completed'

const TAB_CONFIG: { key: Tab; label_es: string; label_en: string; icon: React.ElementType }[] = [
  { key: 'leads',     label_es: 'Cotizaciones', label_en: 'Quotations',  icon: FileText    },
  { key: 'active',    label_es: 'En proceso',   label_en: 'In Progress', icon: HardHat     },
  { key: 'completed', label_es: 'Completados',  label_en: 'Completed',   icon: CheckCircle2 },
]

function jobTab(job: Job): Tab {
  if (job.status === 'completed') return 'completed'
  if (job.client_status === 'approved' || job.status === 'approved' || job.status === 'in_progress') return 'active'
  return 'leads'
}

function StatusBadge({ job, lang }: { job: Job; lang: string }) {
  if (job.client_status === 'approved')
    return <span className="status-dot status-dot-lime">{lang === 'es' ? '✓ Aprobado' : '✓ Approved'}</span>
  if (job.status === 'in_progress')
    return <span className="status-dot status-dot-blue">{lang === 'es' ? 'En obra' : 'In progress'}</span>
  if (job.status === 'completed')
    return <span className="status-dot status-dot-gray">{lang === 'es' ? 'Completado' : 'Completed'}</span>
  if (job.workflow_stage === 'sent')
    return <span className="status-dot status-dot-amber">{lang === 'es' ? 'Enviado' : 'Sent'}</span>
  return <span className="status-dot status-dot-lime">{lang === 'es' ? 'Presupuesto' : 'Estimate'}</span>
}

function borderClass(job: Job) {
  if (job.client_status === 'approved') return 'border-l-4 border-l-[#A8FF3E]'
  if (job.status === 'in_progress')    return 'border-l-4 border-l-[#3B82F6]'
  if (job.status === 'completed')      return 'border-l-4 border-l-[#6B7280]'
  if (job.workflow_stage === 'sent')   return 'border-l-4 border-l-[#F59E0B]'
  return 'border-l-4 border-l-[#4B5563]'
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [loading, setLoading] = useState(true)
  const { lang } = useI18n()
  const { profile, canSeeFinancials } = useProfile()
  const supabase = createClient()
  const orgIdRef = useRef<string | null>(null)

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
      orgIdRef.current = orgId || null

      let q = supabase.from('jobs').select('*').order('created_at', { ascending: false })
      if (orgId) {
        q = q.eq('organization_id', orgId)
      } else {
        q = q.eq('user_id', user.id)
      }

      const { data } = await q
      setJobs((data as Job[]) || [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime subscription
  useEffect(() => {
    const orgId = profile?.organization_id
    if (!orgId) return
    const channel = supabase
      .channel('jobs-list-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `organization_id=eq.${orgId}`,
      }, (payload: { eventType: string; new: Job; old: Job }) => {
        if (payload.eventType === 'INSERT') {
          setJobs(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setJobs(prev => prev.map(j => j.id === payload.new.id ? payload.new : j))
        } else if (payload.eventType === 'DELETE') {
          setJobs(prev => prev.filter(j => j.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id])

  const searchLower = search.toLowerCase()
  const filtered = jobs.filter(
    (j) =>
      jobTab(j) === activeTab &&
      (j.client_name.toLowerCase().includes(searchLower) ||
        (j.client_address || '').toLowerCase().includes(searchLower))
  )

  const counts: Record<Tab, number> = {
    leads:     jobs.filter((j) => jobTab(j) === 'leads').length,
    active:    jobs.filter((j) => jobTab(j) === 'active').length,
    completed: jobs.filter((j) => jobTab(j) === 'completed').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] pb-24 max-w-[430px] mx-auto">
        <div className="px-5 pt-14 pb-4">
          <div className="skeleton h-8 w-32 mb-4" />
          <div className="skeleton h-11 w-full mb-3" />
          <div className="flex gap-2"><div className="skeleton h-9 flex-1" /><div className="skeleton h-9 flex-1" /><div className="skeleton h-9 flex-1" /></div>
        </div>
        <div className="px-5 space-y-2">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
        <AppHeader />
        <MobileNav />
      </div>
    )
  }

  const emptyMsg = {
    leads:     { es: 'Sin cotizaciones abiertas', en: 'No open quotations', cta_es: 'Crear presupuesto', cta_en: 'Create estimate' },
    active:    { es: 'Sin proyectos en proceso', en: 'No projects in progress', cta_es: 'Crear presupuesto', cta_en: 'Create estimate' },
    completed: { es: 'Sin trabajos completados', en: 'No completed jobs', cta_es: 'Ver en proceso', cta_en: 'View in progress' },
  }[activeTab]

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-14 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold text-white">
            {lang === 'es' ? 'Trabajos' : 'Jobs'}
          </h1>
          <Link href="/jobs/new">
            <button className="h-9 px-4 text-sm font-bold rounded-lg btn-lime flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {lang === 'es' ? 'Nuevo' : 'New'}
            </button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <input
            placeholder={lang === 'es' ? 'Buscar cliente o dirección...' : 'Search client or address...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg input-dark text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#1E2228] rounded-xl p-1 border border-[#2A2D35]">
          {TAB_CONFIG.map(({ key, label_es, label_en, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === key
                  ? 'bg-[#A8FF3E] text-[#0F1117]'
                  : 'text-[#6B7280] hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{lang === 'es' ? label_es : label_en}</span>
              {counts[key] > 0 && (
                <span className={`text-[10px] font-bold ${activeTab === key ? 'text-[#0F1117]/60' : 'text-[#A8FF3E]'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Job list */}
      <div className="px-5 space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-10 text-center mt-2">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center">
              <Hammer className="h-6 w-6 text-[#A8FF3E]" />
            </div>
            <p className="text-white font-semibold mb-1">
              {lang === 'es' ? emptyMsg.es : emptyMsg.en}
            </p>
            <Link href="/jobs/new">
              <button className="mt-3 h-10 px-6 text-sm font-bold rounded-lg btn-lime">
                <Plus className="h-4 w-4 mr-1 inline" />
                {lang === 'es' ? emptyMsg.cta_es : emptyMsg.cta_en}
              </button>
            </Link>
          </div>
        ) : (
          filtered.map((job) => {
            const jt = JOB_TYPE_OPTIONS.find((o) => o.value === job.job_type)
            return (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className={`bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 flex items-center justify-between hover:border-[#3A3D45] transition-colors ${borderClass(job)}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {job.job_number && (
                        <span className="text-[10px] font-mono font-bold text-[#A8FF3E] bg-[#A8FF3E]/10 px-1.5 py-0.5 rounded">
                          {formatJobNumber(job.job_number)}
                        </span>
                      )}
                      <p className="font-semibold text-white truncate">{job.client_name}</p>
                    </div>
                    <p className="text-xs text-[#6B7280] truncate mt-0.5">{job.client_address}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <StatusBadge job={job} lang={lang} />
                      <span className="text-[11px] text-[#6B7280]">
                        {lang === 'es' ? jt?.label_es : jt?.label_en}
                      </span>
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
            )
          })
        )}
      </div>

      <AppHeader />
      <MobileNav />
    </div>
  )
}
