'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Briefcase, DollarSign, TrendingUp, Percent, Plus, ChevronRight } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const { t, lang } = useI18n()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('id', user.id)
        .single()
      setProfileName(profile?.full_name || user.email?.split('@')[0] || '')
      setCompanyName(profile?.company_name || '')

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
      const label = format(d, 'MMM')
      months[key] = { month: label, ganancia: 0 }
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
      <div className="min-h-screen bg-[#0F1117] pb-24 max-w-[430px] mx-auto">
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
          <div className="skeleton h-20 w-full" />
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24 max-w-[430px] mx-auto">
      <div className="px-5 pt-14 pb-5">
        <p className="text-[#6B7280] text-sm">{t('dashboard.welcome')}</p>
        <h1 className="text-[32px] font-bold text-white leading-tight mt-0.5">
          {companyName || profileName || 'RoofBack'}
        </h1>
      </div>

      <div className="px-5 space-y-5">
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

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
            <Briefcase className="h-5 w-5 text-[#A8FF3E] mb-2" />
            <p className="text-2xl font-bold tabular-nums text-white">{activeJobs}</p>
            <p className="text-[11px] text-[#6B7280] mt-1">{t('dashboard.activeJobs')}</p>
          </div>
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
            <DollarSign className="h-5 w-5 text-[#3B82F6] mb-2" />
            <p className="text-2xl font-bold tabular-nums text-white">{formatMoney(monthRevenue)}</p>
            <p className="text-[11px] text-[#6B7280] mt-1">{t('dashboard.monthRevenue')}</p>
          </div>
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4">
            <Percent className="h-5 w-5 text-[#6B7280] mb-2" />
            <p className="text-2xl font-bold tabular-nums text-white">{avgMargin.toFixed(1)}%</p>
            <p className="text-[11px] text-[#6B7280] mt-1">{t('dashboard.avgMargin')}</p>
          </div>
        </div>

        <Link href="/jobs/new">
          <button className="w-full h-14 text-base font-bold rounded-xl btn-lime flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" />
            {t('dashboard.newJob')}
          </button>
        </Link>

        {jobs.some((j) => j.status === 'completed') && (
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
                          {Number(job.estimated_total) > 0 && (
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

      <MobileNav />
    </div>
  )
}
