'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, FileText, CheckSquare, Clock, BarChart3, Trash2,
  MapPin, Phone, User
} from 'lucide-react'
import { toast } from 'sonner'
import { STATUS_CONFIG, JOB_TYPE_OPTIONS, ROOF_TYPE_OPTIONS } from '@/lib/templates'
import type { Job } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { t, lang } = useI18n()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single()
      setJob(data as Job)
      setLoading(false)
    }
    load()
  }, [id, supabase])

  async function handleDelete() {
    if (!confirm(t('jobs.deleteConfirm'))) return
    await supabase.from('jobs').delete().eq('id', id)
    toast.success(lang === 'es' ? 'Trabajo borrado' : 'Job deleted')
    router.push('/jobs')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Job not found</p>
      </div>
    )
  }

  const sc = STATUS_CONFIG[job.status]
  const jt = JOB_TYPE_OPTIONS.find((o) => o.value === job.job_type)
  const rt = ROOF_TYPE_OPTIONS.find((o) => o.value === job.roof_type)

  const sections = [
    {
      href: `/jobs/${id}/estimate`,
      icon: FileText,
      title: lang === 'es' ? 'Presupuesto' : 'Estimate',
      desc: lang === 'es' ? 'Armá el presupuesto con materiales y mano de obra' : 'Build estimate with materials and labor',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      href: `/jobs/${id}/checklist`,
      icon: CheckSquare,
      title: lang === 'es' ? 'Checklist de Materiales' : 'Materials Checklist',
      desc: lang === 'es' ? 'Chequeá que tenés todo antes de ir al sitio' : 'Check you have everything before heading out',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      href: `/jobs/${id}/timetrack`,
      icon: Clock,
      title: lang === 'es' ? 'Registro de Trabajo' : 'Work Log',
      desc: lang === 'es' ? 'Registrá horas del crew y gastos extras' : 'Log crew hours and extra expenses',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      href: `/jobs/${id}/results`,
      icon: BarChart3,
      title: lang === 'es' ? 'Resultados' : 'Results',
      desc: lang === 'es' ? '¿Cuánto ganaste en este trabajo?' : 'How much did you make on this job?',
      color: 'bg-emerald-50 text-emerald-600',
    },
  ]

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b px-4 pt-12 pb-4">
        <Link href="/jobs" className="inline-flex items-center text-sm text-gray-500 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('jobs.back')}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.client_name}</h1>
            <Badge variant="secondary" className={`mt-1 ${sc?.color || ''}`}>
              {lang === 'es' ? sc?.label_es : sc?.label_en}
            </Badge>
          </div>
          {Number(job.estimated_total) > 0 && (
            <p className="text-xl font-bold text-gray-900">{formatMoney(Number(job.estimated_total))}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Info del cliente */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400" />
              {job.client_address || '-'}
            </div>
            {job.client_phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${job.client_phone}`} className="text-emerald-600">{job.client_phone}</a>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4 text-gray-400" />
              {lang === 'es' ? jt?.label_es : jt?.label_en} · {lang === 'es' ? rt?.label_es : rt?.label_en}
              {Number(job.square_footage) > 0 && ` · ${job.square_footage} ft²`}
              {job.pitch && ` · ${job.pitch}`}
            </div>
          </CardContent>
        </Card>

        {/* Secciones */}
        <div className="space-y-2">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${s.color}`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('jobs.delete')}
        </Button>
      </div>

      <MobileNav />
    </div>
  )
}
