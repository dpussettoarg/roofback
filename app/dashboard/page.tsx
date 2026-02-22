'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { AppHeader } from '@/components/app/app-header'
import { useProfile } from '@/lib/hooks/useProfile'
import { Briefcase, DollarSign, TrendingUp, Percent, Plus, ChevronRight, Users } from 'lucide-react'
import { STATUS_CONFIG } from '@/lib/templates'
import type { Job } from '@/lib/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [profileName, setProfileName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [customerCount, setCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { t, lang } = useI18n()
  const { profile, canSeeFinancials } = useProfile()
  // Fine-grained: profit hidden from ops, contract total visible to all
  const canSeeProfit = canSeeFinancials  // isOwner only
  const supabase = createClient()

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

      const orgId = prof?.organization_id

      // Fetch jobs for the whole organization (or fall back to user_id)
      let jobQuery = supabase.from('jobs').select('*').order('created_at', { ascending: false })
      if (orgId) {
        jobQuery = jobQuery.eq('organization_id', orgId)
      } else {
        jobQuery = jobQuery.eq('user_id', user.id)
      }
      const { data } = await jobQuery
      setJobs((data as Job[]) || [])

      // Customer count
      if (orgId) {
        const { count } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
        setCustomerCount(count || 0)
      }

      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime for jobs (org-wide)
  useEffect(() => {
    if (!profile?.organization_id) return
    const channel = supabase
      .channel('dashboard-jobs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `organization_id=eq.${profile.organization_id}`,
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

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const activeJobs = jobs.filter((j) => j.status !== 'completed').length
  const completedThisMonth = jobs.filter(
    (j) => j.status === 'completed' && j.completed_at &&
      new Date(j.completed_at) >= monthStart && new Date(j.completed_at) <= monthEnd
  )
  const monthRevenue = completedThisMonth.reduce((s, j) => s + Number(j.estimated_total), 0)
  const monthProfit = completedThisMonth.reduce((s, j) => s + Number(j.profit), 0)
  const avgMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0

  const chartData = useMemo(() => {
    const months: Record<string, { month: string; ganancia: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
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

  const recentJobs = jobs.slice(0, 5)

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
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
        <AppHeader />
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24 max-w-2xl mx-auto">
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
        {/* Financial hero card — owners only */}
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

        {/* Stats grid */}
        <div className={`grid gap-3 ${canSeeProfit ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
            <Briefcase className="h-5 w-5 text-[#A8FF3E] mb-2" />
            <p className="text-2xl font-bold tabular-nums text-white">{activeJobs}</p>
            <p className="text-[11px] text-[#6B7280] mt-1">{t('dashboard.activeJobs')}</p>
          </div>
          <Link href="/customers">
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 hover:border-[#3A3D45] transition-colors cursor-pointer">
              <Users className="h-5 w-5 text-[#A8FF3E] mb-2" />
              <p className="text-2xl font-bold tabular-nums text-white">{customerCount}</p>
              <p className="text-[11px] text-[#6B7280] mt-1">
                {lang === 'es' ? 'Clientes' : 'Customers'}
              </p>
            </div>
          </Link>
          {canSeeProfit && (
            <>
              <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
                <DollarSign className="h-5 w-5 text-[#3B82F6] mb-2" />
                <p className="text-xl font-bold tabular-nums text-white">{formatMoney(monthRevenue)}</p>
                <p className="text-[11px] text-[#6B7280] mt-1">{t('dashboard.monthRevenue')}</p>
              </div>
              <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
                <Percent className="h-5 w-5 text-[#6B7280] mb-2" />
                <p className="text-2xl font-bold tabular-nums text-white">{avgMargin.toFixed(1)}%</p>
                <p className="text-[11px] text-[#6B7280] mt-1">{t('dashboard.avgMargin')}</p>
              </div>
            </>
          )}
        </div>

        {/* New job CTA */}
        <Link href="/jobs/new">
          <button className="w-full h-14 text-base font-bold rounded-xl btn-lime flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" />
            {t('dashboard.newJob')}
          </button>
        </Link>

        {/* Profit chart — owners only */}
        {canSeeProfit && jobs.some((j) => j.status === 'completed') && (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.profitChart')}</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2D35" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    labelFormatter={(l) => String(l)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #2A2D35', background: '#1E2228', color: '#fff' }}
                  />
                  <Bar dataKey="ganancia" fill="#A8FF3E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent jobs */}
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
      </div>

      <AppHeader />
      <MobileNav />
    </div>
  )
}
