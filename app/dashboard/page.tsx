'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400 text-lg">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-emerald-600 px-4 pt-12 pb-6">
        <p className="text-emerald-100 text-sm">{t('dashboard.welcome')},</p>
        <h1 className="text-2xl font-bold text-white">{profileName || 'Techista'} 🔨</h1>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Briefcase className="h-3.5 w-3.5" />
                {t('dashboard.activeJobs')}
              </div>
              <p className="text-2xl font-bold">{activeJobs}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                {t('dashboard.monthRevenue')}
              </div>
              <p className="text-2xl font-bold">{formatMoney(monthRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {t('dashboard.monthProfit')}
              </div>
              <p className={`text-2xl font-bold ${monthProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatMoney(monthProfit)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Percent className="h-3.5 w-3.5" />
                {t('dashboard.avgMargin')}
              </div>
              <p className="text-2xl font-bold">{avgMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* New job button */}
        <Link href="/jobs/new">
          <Button className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg">
            <Plus className="h-5 w-5 mr-2" />
            {t('dashboard.newJob')}
          </Button>
        </Link>

        {/* Profit chart */}
        {jobs.some((j) => j.status === 'completed') && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.profitChart')}</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} labelFormatter={(l) => String(l)} />
                    <Bar dataKey="ganancia" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent jobs */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('dashboard.recentJobs')}</h3>
          {recentJobs.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-6 text-center text-gray-400">
                {t('dashboard.noJobs')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => {
                const sc = STATUS_CONFIG[job.status]
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{job.client_name}</p>
                          <p className="text-xs text-gray-500 truncate">{job.client_address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={`text-xs ${sc?.color || ''}`}>
                              {lang === 'es' ? sc?.label_es : sc?.label_en}
                            </Badge>
                            {Number(job.estimated_total) > 0 && (
                              <span className="text-xs text-gray-500">
                                {formatMoney(Number(job.estimated_total))}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
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
