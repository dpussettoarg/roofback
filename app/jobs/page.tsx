'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Plus, ChevronRight, Search, Hammer } from 'lucide-react'
import { STATUS_CONFIG, JOB_TYPE_OPTIONS } from '@/lib/templates'
import { formatJobNumber } from '@/lib/types'
import type { Job } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

type FilterType = 'all' | 'estimate' | 'active' | 'completed'

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const { t, lang } = useI18n()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setJobs((data as Job[]) || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const filteredJobs = jobs
    .filter((j) =>
      j.client_name.toLowerCase().includes(search.toLowerCase()) ||
      j.client_address.toLowerCase().includes(search.toLowerCase())
    )
    .filter((j) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'estimate') return j.status === 'estimate'
      if (activeFilter === 'active') return j.status === 'approved' || j.status === 'in_progress'
      if (activeFilter === 'completed') return j.status === 'completed'
      return true
    })

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('jobs.all') },
    { key: 'estimate', label: t('jobs.filterEstimate') },
    { key: 'active', label: t('jobs.filterActive') },
    { key: 'completed', label: t('jobs.filterCompleted') },
  ]

  const statusDotClass = (status: string) => {
    switch (status) {
      case 'estimate': return 'status-dot status-dot-lime'
      case 'approved': return 'status-dot status-dot-amber'
      case 'in_progress': return 'status-dot status-dot-blue'
      case 'completed': return 'status-dot status-dot-gray'
      default: return 'status-dot status-dot-gray'
    }
  }

  const borderClass = (status: string) => {
    switch (status) {
      case 'estimate': return 'border-l-4 border-l-[#A8FF3E]'
      case 'approved': return 'border-l-4 border-l-[#F59E0B]'
      case 'in_progress': return 'border-l-4 border-l-[#3B82F6]'
      case 'completed': return 'border-l-4 border-l-[#6B7280]'
      default: return 'border-l-4 border-l-[#6B7280]'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] pb-24 max-w-[430px] mx-auto">
        <div className="px-5 pt-14 pb-4">
          <div className="skeleton h-8 w-32 mb-4" />
          <div className="skeleton h-11 w-full mb-3" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-16" />
            <div className="skeleton h-8 w-24" />
            <div className="skeleton h-8 w-20" />
          </div>
        </div>
        <div className="px-5 space-y-2">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24 max-w-[430px] mx-auto">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold text-white">{t('jobs.title')}</h1>
          <Link href="/jobs/new">
            <button className="h-9 px-4 text-sm font-bold rounded-lg btn-lime flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {lang === 'es' ? 'Nuevo' : 'New'}
            </button>
          </Link>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <input
            placeholder={t('jobs.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg input-dark text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === f.key
                  ? 'bg-[#A8FF3E] text-[#0F1117] font-bold'
                  : 'bg-[#1E2228] border border-[#2A2D35] text-[#6B7280]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-2">
        {filteredJobs.length === 0 ? (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center">
              <Hammer className="h-6 w-6 text-[#A8FF3E]" />
            </div>
            <p className="text-white font-semibold mb-1">{t('jobs.noJobs')}</p>
            <p className="text-[#6B7280] text-sm mb-4">{t('jobs.noJobsCta')}</p>
            <Link href="/jobs/new">
              <button className="h-10 px-6 text-sm font-bold rounded-lg btn-lime">
                <Plus className="h-4 w-4 mr-1 inline" />
                {t('dashboard.newJob')}
              </button>
            </Link>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const sc = STATUS_CONFIG[job.status]
            const jt = JOB_TYPE_OPTIONS.find((o) => o.value === job.job_type)
            return (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className={`bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 flex items-center justify-between hover:border-[#3A3D45] transition-colors ${borderClass(job.status)}`}>
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
                      <span className={statusDotClass(job.status)}>
                        {lang === 'es' ? sc?.label_es : sc?.label_en}
                      </span>
                      <span className="text-[11px] text-[#6B7280]">
                        {lang === 'es' ? jt?.label_es : jt?.label_en}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {Number(job.estimated_total) > 0 && (
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

      <MobileNav />
    </div>
  )
}
