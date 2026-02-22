'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { AppHeader } from '@/components/app/app-header'
import { useProfile } from '@/lib/hooks/useProfile'
import { ErrorBoundary } from '@/components/app/error-boundary'
import {
  Briefcase, DollarSign, TrendingUp, Percent, Plus,
  ChevronRight, Users, Clock, CalendarCheck,
} from 'lucide-react'
import { STATUS_CONFIG } from '@/lib/templates'
import type { Job } from '@/lib/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'

// ── Dynamic imports (client-only, never SSR) ─────────────────────────────────
//
// AiAdvisorCard: contains PDFDownloadLink + DailyReportPDF + AI fetch logic.
// Isolating it in a separate dynamic chunk prevents @react-pdf/renderer from
// landing in the same module scope as the dashboard and triggering the
// "ie is not a function" crash.
const AiAdvisorCard = dynamic(
  () => import('@/components/app/ai-advisor-card'),
  {
    ssr: false,
    loading: () => (
      <div className="relative overflow-hidden rounded-xl border border-[#2A2D35] p-5"
        style={{ background: 'linear-gradient(135deg, #0d1f0a 0%, #111827 40%, #0F1117 100%)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#2A2D35] animate-pulse" />
          <div className="h-4 w-40 bg-[#2A2D35] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#16191F] rounded-lg p-4 animate-pulse">
              <div className="h-3 bg-[#2A2D35] rounded w-1/3 mb-2" />
              <div className="h-2 bg-[#2A2D35] rounded w-full mb-1" />
              <div className="h-2 bg-[#2A2D35] rounded w-4/5" />
            </div>
          ))}
        </div>
      </div>
    ),
  }
)

// ProfitChart: Recharts must be client-only to avoid width(-1) crash.
const ProfitChart = dynamic(
  () => import('@/components/app/profit-chart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-full flex items-end gap-1 px-2 pb-2">
        {[40, 65, 30, 80, 55, 90].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-[#2A2D35] animate-pulse" style={{ height: `${h}%` }} />
        ))}
      </div>
    ),
  }
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

function BurnBar({ pct, className = '' }: { pct: number; className?: string }) {
  const clamped = Math.min(pct, 100)
  const color = pct > 100 ? '#F87171' : pct > 80 ? '#FBBF24' : '#A8FF3E'
  return (
    <div className={`h-1.5 rounded-full bg-[#0F1117] overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [jobs, setJobs]                   = useState<Job[]>([])
  const [profileName, setProfileName]     = useState('')
  const [companyName, setCompanyName]     = useState('')
  const [customerCount, setCustomerCount] = useState(0)
  const [loading, setLoading]             = useState(true)
  const [orgId, setOrgId]                 = useState<string | null>(null)

  const { t, lang } = useI18n()
  const { profile, canSeeFinancials } = useProfile()
  const canSeeProfit = canSeeFinancials
  const supabase = createClient()

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, company_name, organization_id, role')
        .eq('id', user.id)
        .single()

      setProfileName(prof?.full_name || user.email?.split('@')[0] || '')
      setCompanyName(prof?.company_name || '')
      const oid = prof?.organization_id || null
      setOrgId(oid)

      let jobQuery = supabase.from('jobs').select('*').order('created_at', { ascending: false })
      if (oid) {
        jobQuery = jobQuery.eq('organization_id', oid)
      } else {
        jobQuery = jobQuery.eq('user_id', user.id)
      }
      const { data } = await jobQuery
      setJobs((data as Job[]) || [])

      if (oid) {
        const { count } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', oid)
        setCustomerCount(count || 0)
      }

      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.organization_id) return
    const channel = supabase
      .channel('dashboard-jobs')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'jobs',
        filter: `organization_id=eq.${profile.organization_id}`,
      }, (payload: { eventType: string; new: Job; old: Job }) => {
        if (payload.eventType === 'INSERT')
          setJobs((prev) => [payload.new, ...prev])
        else if (payload.eventType === 'UPDATE')
          setJobs((prev) => prev.map((j) => j.id === payload.new.id ? payload.new : j))
        else if (payload.eventType === 'DELETE')
          setJobs((prev) => prev.filter((j) => j.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id])

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const activeJobs = jobs.filter((j) => j.status !== 'completed')

  const completedThisMonth = jobs.filter(
    (j) => j.status === 'completed' && j.completed_at &&
      new Date(j.completed_at) >= monthStart &&
      new Date(j.completed_at) <= monthEnd
  )
  const monthRevenue = completedThisMonth.reduce((s, j) => s + Number(j.estimated_total), 0)
  const monthProfit  = completedThisMonth.reduce((s, j) => s + Number(j.profit), 0)
  const avgMargin    = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0

  const totalEstimated = activeJobs.reduce((s, j) => s + Number(j.estimated_total), 0)
  const totalActual    = activeJobs.reduce((s, j) => s + Number(j.actual_total || 0), 0)
  const orgBurnPct     = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0

  const chartData = useMemo(() => {
    const months: Record<string, { month: string; ganancia: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = format(d, 'yyyy-MM')
      months[key] = { month: format(d, 'MMM'), ganancia: 0 }
    }
    jobs
      .filter((j) => j.status === 'completed' && j.completed_at)
      .forEach((j) => {
        const key = format(new Date(j.completed_at!), 'yyyy-MM')
        if (months[key]) months[key].ganancia += Number(j.profit)
      })
    return Object.values(months)
  }, [jobs, now])

  // Build job rows for the PDF (passed as prop — no state mutation inside AI card)
  const activeJobsForPdf = useMemo(() => activeJobs.map((j) => {
    const budget = Number(j.simple_materials_budget) + Number(j.simple_labor_budget) + Number(j.simple_other_budget)
    const actual = Number(j.actual_total || 0)
    const base   = budget > 0 ? budget : Number(j.estimated_total)
    const burn   = base > 0 ? (actual / base) * 100 : 0
    return {
      client_name:      j.client_name,
      workflow_stage:   j.workflow_stage,
      estimated_total:  Number(j.estimated_total),
      actualCost:       actual,
      burnPct:          burn,
      isOverBudget:     burn > 100,
    }
  }), [activeJobs])

  const recentJobs = jobs.slice(0, 5)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const statusDotClass = (status: string) => {
    switch (status) {
      case 'estimate':   return 'status-dot status-dot-lime'
      case 'approved':   return 'status-dot status-dot-amber'
      case 'in_progress':return 'status-dot status-dot-blue'
      case 'completed':  return 'status-dot status-dot-gray'
      default:           return 'status-dot status-dot-gray'
    }
  }

  const borderClass = (status: string) => {
    switch (status) {
      case 'estimate':    return 'border-l-4 border-l-[#A8FF3E]'
      case 'approved':    return 'border-l-4 border-l-[#F59E0B]'
      case 'in_progress': return 'border-l-4 border-l-[#3B82F6]'
      case 'completed':   return 'border-l-4 border-l-[#6B7280]'
      default:            return 'border-l-4 border-l-[#6B7280]'
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] pb-24 max-w-2xl mx-auto">
        <div className="px-5 pt-14 pb-5">
          <div className="skeleton h-4 w-20 mb-2" />
          <div className="skeleton h-8 w-48" />
        </div>
        <div className="px-5 space-y-4">
          <div className="skeleton h-32 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
          <div className="skeleton h-40 w-full rounded-xl" />
          <div className="skeleton h-14 w-full" />
        </div>
        <AppHeader />
        <MobileNav />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0F1117] pb-24 max-w-2xl mx-auto">

      {/* Page Header */}
      <div className="px-5 pt-14 pb-5">
        <p className="text-[#6B7280] text-sm">{t('dashboard.welcome')}</p>
        <div className="flex items-end justify-between">
          <h1 className="text-[32px] font-bold text-white leading-tight mt-0.5">
            {companyName || profileName || 'RoofBack'}
          </h1>
          {profile?.role && profile.role !== 'owner' && (
            <span className="text-xs font-semibold text-[#6B7280] bg-[#1E2228] border border-[#2A2D35] px-2 py-1 rounded-full capitalize mb-1">
              {profile.role}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 space-y-5">

        {/* Financial hero — owners only */}
        {canSeeProfit && (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-5">
            <p className="text-[#A8FF3E] text-xs font-bold uppercase tracking-widest mb-2">
              {t('dashboard.profitThisMonth')}
            </p>
            <p className={`text-[56px] font-black tabular-nums leading-none ${monthProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              {formatMoney(monthProfit)}
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <TrendingUp className="h-4 w-4 text-[#6B7280]" />
              <span className="text-sm text-[#6B7280]">
                {avgMargin.toFixed(1)}% {t('dashboard.margin')}
              </span>
            </div>
          </div>
        )}

        {/* Top stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
            <Briefcase className="h-4 w-4 text-[#A8FF3E] mb-2" />
            <p className="text-2xl font-bold tabular-nums text-white">{activeJobs.length}</p>
            <p className="text-[10px] text-[#6B7280] mt-1 leading-tight">
              {lang === 'es' ? 'Proyectos Activos' : 'Active Projects'}
            </p>
          </div>

          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
            <CalendarCheck className="h-4 w-4 text-[#FBBF24] mb-2" />
            <p className="text-2xl font-bold tabular-nums text-white">—</p>
            <p className="text-[10px] text-[#6B7280] mt-1 leading-tight">
              {lang === 'es' ? 'Hitos Hoy' : 'Milestones Today'}
            </p>
          </div>

          {canSeeFinancials ? (
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
              <DollarSign className="h-4 w-4 text-[#3B82F6] mb-2" />
              <p className={`text-xl font-bold tabular-nums ${orgBurnPct > 85 ? 'text-red-400' : 'text-white'}`}>
                {orgBurnPct.toFixed(0)}%
              </p>
              <p className="text-[10px] text-[#6B7280] mt-1 leading-tight">
                {lang === 'es' ? 'Burn Rate Org' : 'Org Burn Rate'}
              </p>
            </div>
          ) : (
            <Link href="/customers">
              <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 hover:border-[#3A3D45] transition-colors cursor-pointer">
                <Users className="h-4 w-4 text-[#A8FF3E] mb-2" />
                <p className="text-2xl font-bold tabular-nums text-white">{customerCount}</p>
                <p className="text-[10px] text-[#6B7280] mt-1 leading-tight">
                  {lang === 'es' ? 'Clientes' : 'Customers'}
                </p>
              </div>
            </Link>
          )}
        </div>

        {/* Secondary stats — owners only */}
        {canSeeProfit && (
          <div className="grid grid-cols-3 gap-3">
            <Link href="/customers">
              <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 hover:border-[#3A3D45] transition-colors cursor-pointer">
                <Users className="h-4 w-4 text-[#A8FF3E] mb-2" />
                <p className="text-2xl font-bold tabular-nums text-white">{customerCount}</p>
                <p className="text-[10px] text-[#6B7280] mt-1">{lang === 'es' ? 'Clientes' : 'Customers'}</p>
              </div>
            </Link>
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
              <DollarSign className="h-4 w-4 text-[#3B82F6] mb-2" />
              <p className="text-xl font-bold tabular-nums text-white">{formatMoney(monthRevenue)}</p>
              <p className="text-[10px] text-[#6B7280] mt-1">{t('dashboard.monthRevenue')}</p>
            </div>
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
              <Percent className="h-4 w-4 text-[#6B7280] mb-2" />
              <p className="text-2xl font-bold tabular-nums text-white">{avgMargin.toFixed(1)}%</p>
              <p className="text-[10px] text-[#6B7280] mt-1">{t('dashboard.avgMargin')}</p>
            </div>
          </div>
        )}

        {/* New job CTA */}
        <Link href="/jobs/new">
          <button className="w-full h-14 text-base font-bold rounded-xl btn-lime flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" />
            {t('dashboard.newJob')}
          </button>
        </Link>

        {/* ══ AI BUSINESS ADVISOR — isolated dynamic import + error boundary ══ */}
        <ErrorBoundary
          fallback={
            <div className="flex items-center gap-3 rounded-xl border border-[#2A2D35] bg-[#1E2228] p-4 text-sm text-[#6B7280]">
              <span>
                {lang === 'es'
                  ? 'Asesor temporalmente no disponible.'
                  : 'Advisor temporarily unavailable.'}
              </span>
            </div>
          }
        >
          <AiAdvisorCard
            lang={lang}
            orgId={orgId}
            companyName={companyName}
            profileName={profileName}
            activeJobsForPdf={activeJobsForPdf}
          />
        </ErrorBoundary>

        {/* Active jobs progress list */}
        {activeJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                {lang === 'es' ? 'Proyectos En Curso' : 'Active Projects'}
              </h3>
              <Link href="/jobs" className="text-xs text-[#A8FF3E] font-medium">
                {t('dashboard.viewAll')}
              </Link>
            </div>
            <div className="space-y-2.5">
              {activeJobs.slice(0, 6).map((job) => {
                const budget = Number(job.simple_materials_budget) + Number(job.simple_labor_budget) + Number(job.simple_other_budget)
                const actual = Number(job.actual_total || 0)
                const base   = budget > 0 ? budget : Number(job.estimated_total)
                const burnPct = base > 0 ? (actual / base) * 100 : 0

                const stageOrder = ['approved', 'materials_ordered', 'in_progress', 'completed']
                const stageIdx   = stageOrder.indexOf(job.workflow_stage)
                const milestonePct = stageIdx >= 0 ? ((stageIdx + 1) / stageOrder.length) * 100 : 25

                return (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className={`bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 hover:border-[#3A3D45] transition-colors ${borderClass(job.status)}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white truncate text-sm">{job.client_name}</p>
                          <p className="text-xs text-[#6B7280] truncate">{job.client_address}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canSeeFinancials && Number(job.estimated_total) > 0 && (
                            <span className="text-xs font-bold text-white tabular-nums">
                              {formatMoney(Number(job.estimated_total))}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-[#6B7280]" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-[#6B7280] flex-shrink-0" />
                          <div className="flex-1"><BurnBar pct={milestonePct} /></div>
                          <span className="text-[10px] text-[#6B7280] tabular-nums w-8 text-right">
                            {milestonePct.toFixed(0)}%
                          </span>
                        </div>
                        {canSeeFinancials && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3 text-[#6B7280] flex-shrink-0" />
                            <div className="flex-1"><BurnBar pct={burnPct} /></div>
                            <span className={`text-[10px] tabular-nums w-8 text-right ${burnPct > 100 ? 'text-red-400' : burnPct > 80 ? 'text-yellow-400' : 'text-[#6B7280]'}`}>
                              {burnPct.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2">
                        <span className={statusDotClass(job.status)}>
                          {lang === 'es' ? STATUS_CONFIG[job.status]?.label_es : STATUS_CONFIG[job.status]?.label_en}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Profit chart — owners only */}
        {canSeeProfit && Array.isArray(chartData) && chartData.length > 0 && (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.profitChart')}</h3>
            <ErrorBoundary>
              <ProfitChart data={chartData} />
            </ErrorBoundary>
          </div>
        )}

        {/* Recent completed jobs (when no active) */}
        {activeJobs.length === 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{t('dashboard.recentJobs')}</h3>
              {recentJobs.length > 0 && (
                <Link href="/jobs" className="text-xs text-[#A8FF3E] font-medium">
                  {t('dashboard.viewAll')}
                </Link>
              )}
            </div>
            {recentJobs.length === 0 ? (
              <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-[#A8FF3E]" />
                </div>
                <p className="text-[#6B7280] text-sm">{t('dashboard.noJobs')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => {
                  const sc = STATUS_CONFIG[job.status]
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className={`bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 flex items-center justify-between hover:border-[#3A3D45] transition-colors ${borderClass(job.status)}`}>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white truncate">{job.client_name}</p>
                          <p className="text-xs text-[#6B7280] truncate mt-0.5">{job.client_address}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={statusDotClass(job.status)}>
                              {lang === 'es' ? sc?.label_es : sc?.label_en}
                            </span>
                            {canSeeFinancials && Number(job.estimated_total) > 0 && (
                              <span className="text-xs text-[#6B7280] tabular-nums font-medium">
                                {formatMoney(Number(job.estimated_total))}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#6B7280] flex-shrink-0 ml-3" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      <AppHeader />
      <MobileNav />
    </div>
  )
}
