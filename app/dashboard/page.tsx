'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  const [loading, setLoading] = useState(true)
  const { t, lang } = useI18n()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setProfileName(profile?.full_name || user.email?.split('@')[0] || '')

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-[#008B99] animate-spin" />
          <span className="text-slate-400 text-sm">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">{t('dashboard.welcome')}</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{profileName || 'Techista'}</h1>
          </div>
          <div className="h-11 w-11 rounded-full bg-gradient-brand flex items-center justify-center text-white font-semibold text-sm">
            {(profileName || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Main Profit Widget */}
        <Card className="border-t-gradient border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5 pt-6">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
              {t('dashboard.monthProfit')}
            </p>
            <p className={`text-3xl font-bold tabular-nums ${monthProfit >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
              {formatMoney(monthProfit)}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3.5 w-3.5 text-[#78BE20]" />
              <span className="text-xs text-[#78BE20] font-medium">
                {avgMargin.toFixed(1)}% {lang === 'es' ? 'margen' : 'margin'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <Briefcase className="h-4 w-4 text-[#008B99] mb-2" />
            <p className="text-xl font-bold tabular-nums text-slate-900">{activeJobs}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('dashboard.activeJobs')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <DollarSign className="h-4 w-4 text-[#78BE20] mb-2" />
            <p className="text-xl font-bold tabular-nums text-slate-900">{formatMoney(monthRevenue)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('dashboard.monthRevenue')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <Percent className="h-4 w-4 text-[#008B99] mb-2" />
            <p className="text-xl font-bold tabular-nums text-slate-900">{avgMargin.toFixed(1)}%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('dashboard.avgMargin')}</p>
          </div>
        </div>

        {/* New Job Button */}
        <Link href="/jobs/new">
          <button className="w-full h-14 text-base font-medium rounded-2xl btn-gradient flex items-center justify-center gap-2 shadow-lg">
            <Plus className="h-5 w-5" />
            {t('dashboard.newJob')}
          </button>
        </Link>

        {/* Profit Chart */}
        {jobs.some((j) => j.status === 'completed') && (
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('dashboard.profitChart')}</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => formatMoney(Number(v))}
                      labelFormatter={(l) => String(l)}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                    />
                    <Bar dataKey="ganancia" fill="url(#chartGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#008B99" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#78BE20" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">{t('dashboard.recentJobs')}</h3>
            {recentJobs.length > 0 && (
              <Link href="/jobs" className="text-xs text-[#008B99] font-medium">
                {lang === 'es' ? 'Ver todos' : 'View all'}
              </Link>
            )}
          </div>
          {recentJobs.length === 0 ? (
            <Card className="border-0 shadow-sm bg-white rounded-2xl">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-brand-subtle flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-[#008B99]" />
                </div>
                <p className="text-slate-400 text-sm">{t('dashboard.noJobs')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => {
                const sc = STATUS_CONFIG[job.status]
                const statusClass =
                  job.status === 'estimate' ? 'status-estimate' :
                  job.status === 'approved' ? 'status-approved' :
                  job.status === 'in_progress' ? 'status-in-progress' :
                  'status-completed'
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card className="border-0 shadow-sm bg-white rounded-xl hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{job.client_name}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{job.client_address}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${statusClass}`}>
                              {lang === 'es' ? sc?.label_es : sc?.label_en}
                            </span>
                            {Number(job.estimated_total) > 0 && (
                              <span className="text-xs text-slate-500 tabular-nums font-medium">
                                {formatMoney(Number(job.estimated_total))}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0 ml-3" />
                      </CardContent>
                    </Card>
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
