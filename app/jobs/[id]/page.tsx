'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import {
  ArrowLeft, FileText, CheckSquare, Clock, BarChart3, Trash2,
  MapPin, Phone, User, Send, CheckCircle, Link2, Copy, ChevronRight
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
      <div className="flex items-center justify-center min-h-screen bg-[#0F1117]">
        <div className="w-8 h-8 rounded-full border-2 border-[#2A2D35] border-t-[#A8FF3E] animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1117]">
        <p className="text-[#6B7280]">Job not found</p>
      </div>
    )
  }

  const sc = STATUS_CONFIG[job.status]
  const jt = JOB_TYPE_OPTIONS.find((o) => o.value === job.job_type)
  const rt = ROOF_TYPE_OPTIONS.find((o) => o.value === job.roof_type)

  const statusDotClass =
    job.status === 'estimate' ? 'status-dot-lime' :
    job.status === 'approved' ? 'status-dot-amber' :
    job.status === 'in_progress' ? 'status-dot-blue' :
    'status-dot-gray'

  const isApprovedByClient = job.client_status === 'approved'

  const sections = [
    {
      href: `/jobs/${id}/estimate`,
      icon: FileText,
      title: t('jobDetail.estimate'),
      desc: t('jobDetail.estimateDesc'),
    },
    {
      href: `/jobs/${id}/checklist`,
      icon: CheckSquare,
      title: t('jobDetail.checklist'),
      desc: t('jobDetail.checklistDesc'),
    },
    {
      href: `/jobs/${id}/timetrack`,
      icon: Clock,
      title: t('jobDetail.timetrack'),
      desc: t('jobDetail.timetrackDesc'),
    },
    {
      href: `/jobs/${id}/results`,
      icon: BarChart3,
      title: t('jobDetail.results'),
      desc: t('jobDetail.resultsDesc'),
    },
  ]

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      {/* Top Header */}
      <div className="w-full max-w-[430px] mx-auto px-5 pt-12 pb-4">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] mb-4 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('jobs.back')}
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-[28px] font-bold text-white leading-tight truncate">
              {job.client_name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`status-dot ${statusDotClass} text-xs font-medium`}>
                {lang === 'es' ? sc?.label_es : sc?.label_en}
              </span>
              {isApprovedByClient && (
                <span className="text-xs font-medium text-[#A8FF3E] flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t('jobDetail.clientApproved')}
                </span>
              )}
            </div>
          </div>
          {Number(job.estimated_total) > 0 && (
            <p className="text-xl font-bold text-white tabular-nums ml-3">
              {formatMoney(Number(job.estimated_total))}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-[430px] mx-auto px-5 py-4 space-y-4">

        {/* Info Strip */}
        <p className="text-[13px] text-[#6B7280]">
          {lang === 'es' ? jt?.label_es : jt?.label_en}
          {rt && ` \u00B7 ${lang === 'es' ? rt.label_es : rt.label_en}`}
          {Number(job.square_footage) > 0 && ` \u00B7 ${job.square_footage} ft\u00B2`}
          {job.pitch && ` \u00B7 ${job.pitch}`}
        </p>

        {/* Google Maps Embed Card */}
        {job.client_address && (
          <div
            className="rounded-lg overflow-hidden border border-[#2A2D35]"
            style={{ height: 120 }}
          >
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(job.client_address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="120"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {/* Client Info */}
        <div className="space-y-2">
          {job.client_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-[#6B7280]" />
              <a
                href={`tel:${job.client_phone}`}
                className="text-[#A8FF3E] hover:underline"
              >
                {job.client_phone}
              </a>
            </div>
          )}
          {job.client_address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-[#6B7280]" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.client_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A8FF3E] hover:underline"
              >
                {job.client_address}
              </a>
            </div>
          )}
        </div>

        {/* Action Cards */}
        <div className="space-y-3">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <div className="bg-[#1E2228] border-l-4 border-[#A8FF3E] rounded-[12px] p-4 flex items-center gap-4 hover:bg-[#252830] transition-all duration-200 cursor-pointer mt-0 mb-0" style={{ marginTop: s.href === sections[0].href ? 0 : undefined }}>
                <s.icon className="h-8 w-8 text-[#A8FF3E] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-white">{s.title}</p>
                  <p className="text-[13px] text-[#6B7280]">{s.desc}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#6B7280] flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Send to Client / Copy Link */}
        {Number(job.estimated_total) > 0 && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowSendDialog(true)}
              className="flex-1 h-12 rounded-[8px] bg-[#A8FF3E] text-[#0F1117] font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all duration-200"
            >
              <Send className="h-4 w-4" />
              {t('jobDetail.sendToClient')}
            </button>
            <button
              onClick={handleCopyLink}
              className="h-12 px-4 rounded-[8px] border border-[#2A2D35] bg-transparent text-[#6B7280] flex items-center justify-center hover:bg-[#1E2228] transition-all duration-200"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Profit Tracking Card */}
        {(job.status === 'approved' || job.status === 'in_progress' || job.status === 'completed') && Number(job.estimated_total) > 0 && (
          <div className="bg-[#1E2228] rounded-[12px] overflow-hidden border border-[#2A2D35]">
            {/* Lime green top accent */}
            <div className="h-1 bg-[#A8FF3E]" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  {t('jobDetail.tracking')}
                </h3>
                <span className="text-xs text-[#6B7280]">
                  {t('jobDetail.estimateVsActual')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-[#0F1117] rounded-[8px]">
                  <p className="text-xs text-[#6B7280] mb-1">{t('jobDetail.budgeted')}</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {formatMoney(Number(job.estimated_total))}
                  </p>
                </div>
                <div className="text-center p-3 bg-[#0F1117] rounded-[8px]">
                  <p className="text-xs text-[#6B7280] mb-1">{t('jobDetail.spent')}</p>
                  <p className={`text-lg font-bold tabular-nums ${Number(job.actual_total) > Number(job.estimated_total) ? 'text-red-400' : 'text-[#A8FF3E]'}`}>
                    {formatMoney(Number(job.actual_total) || 0)}
                  </p>
                </div>
              </div>
              {Number(job.actual_total) > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-[#6B7280] mb-1.5">
                    <span>{t('jobDetail.spendProgress')}</span>
                    <span>{((Number(job.actual_total) / Number(job.estimated_total)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-[#0F1117] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#A8FF3E] transition-all"
                      style={{ width: `${Math.min((Number(job.actual_total) / Number(job.estimated_total)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="w-full py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-[8px] transition-all duration-200 flex items-center justify-center gap-2 bg-transparent border-none"
        >
          <Trash2 className="h-4 w-4" />
          {t('jobs.delete')}
        </button>
      </div>

      {/* Send Dialog */}
      {showSendDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSendDialog(false)}
          />
          <div className="relative bg-[#1E2228] rounded-t-2xl sm:rounded-[12px] w-full sm:max-w-md p-6 pb-8 space-y-4 shadow-xl border border-[#2A2D35]">
            <h3 className="text-lg font-semibold text-white">
              {lang === 'es' ? 'Enviar presupuesto' : 'Send estimate'}
            </h3>
            <div className="space-y-2">
              <label className="text-[#6B7280] text-sm block">
                {lang === 'es' ? 'Email del cliente' : 'Client email'}
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@email.com"
                className="w-full h-12 rounded-[8px] bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#6B7280] focus:outline-none focus:border-[#A8FF3E] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#6B7280] text-sm block">
                {lang === 'es' ? 'Link de propuesta' : 'Proposal link'}
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/proposal/${job?.public_token}`}
                  className="flex-1 h-10 rounded-[8px] bg-[#0F1117] border border-[#2A2D35] px-3 text-xs text-[#6B7280] focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="h-10 px-3 rounded-[8px] border border-[#2A2D35] bg-transparent text-[#6B7280] hover:bg-[#252830] transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSendDialog(false)}
                className="flex-1 h-12 rounded-[8px] border border-[#2A2D35] bg-transparent text-[#6B7280] text-sm font-medium hover:bg-[#252830] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSendToClient}
                disabled={!clientEmail}
                className="flex-1 h-12 rounded-[8px] bg-[#A8FF3E] text-[#0F1117] font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all duration-200 disabled:opacity-50"
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
