'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { STATUS_CONFIG, JOB_TYPE_OPTIONS } from '@/lib/templates'
import type { Job } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
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

  const filteredJobs = jobs.filter(
    (j) =>
      j.client_name.toLowerCase().includes(search.toLowerCase()) ||
      j.client_address.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400 text-lg">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">{t('jobs.title')}</h1>
          <Link href="/jobs/new">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" />
              {lang === 'es' ? 'Nuevo' : 'New'}
            </Button>
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={lang === 'es' ? 'Buscar por cliente o dirección...' : 'Search by client or address...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {filteredJobs.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <p className="text-gray-400 mb-4">{t('jobs.noJobs')}</p>
              <Link href="/jobs/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.newJob')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const sc = STATUS_CONFIG[job.status]
            const jt = JOB_TYPE_OPTIONS.find((o) => o.value === job.job_type)
            return (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{job.client_name}</p>
                      <p className="text-xs text-gray-500 truncate">{job.client_address}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className={`text-xs ${sc?.color || ''}`}>
                          {lang === 'es' ? sc?.label_es : sc?.label_en}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {lang === 'es' ? jt?.label_es : jt?.label_en}
                        </span>
                        {Number(job.estimated_total) > 0 && (
                          <span className="text-xs font-medium text-gray-600">
                            {formatMoney(Number(job.estimated_total))}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0 ml-2" />
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>

      <MobileNav />
    </div>
  )
}
