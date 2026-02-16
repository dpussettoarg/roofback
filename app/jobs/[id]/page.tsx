'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, FileText, CheckSquare, Clock, BarChart3, Trash2,
  MapPin, Phone, User, Send, CheckCircle, Link2, Copy
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
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [clientEmail, setClientEmail] = useState('')
  const router = useRouter()
  const { t, lang } = useI18n()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single()
      const j = data as Job
      setJob(j)
      setClientEmail(j?.client_email || '')
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

  function handleSendToClient() {
    const proposalUrl = `${window.location.origin}/proposal/${job?.public_token}`
    const subject = encodeURIComponent(
      lang === 'es'
        ? `Presupuesto - ${job?.client_name}`
        : `Estimate - ${job?.client_name}`
    )
    const body = encodeURIComponent(
      lang === 'es'
        ? `Hola ${job?.client_name},\n\nAcá podés ver y aprobar tu presupuesto:\n${proposalUrl}\n\nGracias!`
        : `Hi ${job?.client_name},\n\nYou can view and approve your estimate here:\n${proposalUrl}\n\nThanks!`
    )
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, '_blank')
    setShowSendDialog(false)
    toast.success(lang === 'es' ? 'Se abrió tu app de email' : 'Email app opened')
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/proposal/${job?.public_token}`
    navigator.clipboard.writeText(url)
    toast.success(lang === 'es' ? '¡Link copiado!' : 'Link copied!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#008B99] animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-slate-400">Job not found</p>
      </div>
    )
  }

  const sc = STATUS_CONFIG[job.status]
  const jt = JOB_TYPE_OPTIONS.find((o) => o.value === job.job_type)
  const rt = ROOF_TYPE_OPTIONS.find((o) => o.value === job.roof_type)

  const statusClass =
    job.status === 'estimate' ? 'status-estimate' :
    job.status === 'approved' ? 'status-approved' :
    job.status === 'in_progress' ? 'status-in-progress' :
    'status-completed'

  const isApprovedByClient = job.client_status === 'approved'

  const sections = [
    {
      href: `/jobs/${id}/estimate`,
      icon: FileText,
      title: lang === 'es' ? 'Presupuesto' : 'Estimate',
      desc: lang === 'es' ? 'Armá el presupuesto simple o detallado' : 'Build simple or itemized estimate',
      color: 'bg-[#008B99]/10 text-[#008B99]',
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
      color: 'bg-[#78BE20]/10 text-[#3D7A00]',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <Link href="/jobs" className="inline-flex items-center text-sm text-slate-400 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('jobs.back')}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{job.client_name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusClass}`}>
                {lang === 'es' ? sc?.label_es : sc?.label_en}
              </span>
              {isApprovedByClient && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#78BE20]/10 text-[#3D7A00] flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {lang === 'es' ? 'Cliente aprobó' : 'Client approved'}
                </span>
              )}
            </div>
          </div>
          {Number(job.estimated_total) > 0 && (
            <p className="text-xl font-bold text-slate-900 tabular-nums">{formatMoney(Number(job.estimated_total))}</p>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Client Info */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 space-y-2">
            {job.client_address && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                {job.client_address}
              </div>
            )}
            {job.client_phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                <a href={`tel:${job.client_phone}`} className="text-[#008B99]">{job.client_phone}</a>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="h-4 w-4 text-slate-400" />
              {lang === 'es' ? jt?.label_es : jt?.label_en} · {lang === 'es' ? rt?.label_es : rt?.label_en}
              {Number(job.square_footage) > 0 && ` · ${job.square_footage} ft²`}
              {job.pitch && ` · ${job.pitch}`}
            </div>
          </CardContent>
        </Card>

        {/* Send to Client / Copy Link */}
        {Number(job.estimated_total) > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSendDialog(true)}
              className="flex-1 h-12 rounded-xl btn-gradient flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              {lang === 'es' ? 'Enviar al cliente' : 'Send to client'}
            </button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="h-12 rounded-xl border-slate-200 px-4"
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Profit Tracking Card (shown when approved) */}
        {(job.status === 'approved' || job.status === 'in_progress' || job.status === 'completed') && Number(job.estimated_total) > 0 && (
          <Card className="border-t-gradient border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {lang === 'es' ? 'Seguimiento' : 'Tracking'}
                </h3>
                <span className="text-xs text-slate-400">
                  {lang === 'es' ? 'Presupuesto vs Real' : 'Estimate vs Actual'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">{lang === 'es' ? 'Presupuestado' : 'Estimated'}</p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{formatMoney(Number(job.estimated_total))}</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">{lang === 'es' ? 'Gastado' : 'Spent'}</p>
                  <p className={`text-lg font-bold tabular-nums ${Number(job.actual_total) > Number(job.estimated_total) ? 'text-red-500' : 'text-[#008B99]'}`}>
                    {formatMoney(Number(job.actual_total) || 0)}
                  </p>
                </div>
              </div>
              {Number(job.actual_total) > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{lang === 'es' ? 'Progreso de gasto' : 'Spending progress'}</span>
                    <span>{((Number(job.actual_total) / Number(job.estimated_total)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-brand-horizontal transition-all"
                      style={{ width: `${Math.min((Number(job.actual_total) / Number(job.estimated_total)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        <div className="space-y-2">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="border-0 shadow-sm bg-white rounded-xl hover:shadow-md transition-all duration-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          className="w-full text-red-400 hover:text-red-500 hover:bg-red-50"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('jobs.delete')}
        </Button>
      </div>

      {/* Send Dialog */}
      {showSendDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSendDialog(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {lang === 'es' ? 'Enviar presupuesto' : 'Send estimate'}
            </h3>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">{lang === 'es' ? 'Email del cliente' : 'Client email'}</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@email.com"
                className="h-12 rounded-xl bg-slate-50/50 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">{lang === 'es' ? 'Link de propuesta' : 'Proposal link'}</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/proposal/${job?.public_token}`}
                  className="h-10 text-xs bg-slate-50 border-slate-200 rounded-lg flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-10 rounded-lg">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setShowSendDialog(false)}>
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <button
                onClick={handleSendToClient}
                disabled={!clientEmail}
                className="flex-1 h-12 rounded-xl btn-gradient flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {lang === 'es' ? 'Enviar' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  )
}
