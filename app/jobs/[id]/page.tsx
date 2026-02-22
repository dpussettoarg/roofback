'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { AppHeader } from '@/components/app/app-header'
import {
  ArrowLeft, FileText, CheckSquare, Clock, BarChart3, Trash2,
  MapPin, Phone, Send, CheckCircle, Link2, Copy, ChevronRight,
  ShieldCheck, CalendarCheck, Lock, HardHat, CalendarDays,
  MessageSquare, Package, TrendingUp, TrendingDown, AlertCircle,
  Smartphone, MessageCircle, ChevronDown, ChevronUp,
  ClipboardList, Wrench, HardDriveDownload, Flag,
} from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TYPE_OPTIONS, ROOF_TYPE_OPTIONS } from '@/lib/templates'
import { formatJobNumber } from '@/lib/types'
import { useProfile } from '@/lib/hooks/useProfile'
import { usePermissions } from '@/lib/hooks/usePermissions'
import type { Job } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function pct(actual: number, budget: number) {
  if (!budget) return 0
  return Math.min((actual / budget) * 100, 100)
}

function BudgetBar({
  label, budgeted, actual, lang,
}: { label: string; budgeted: number; actual: number; lang: string }) {
  const over = actual > budgeted && budgeted > 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#9CA3AF]">{label}</span>
        <span className={over ? 'text-red-400 font-semibold' : 'text-[#A8FF3E] font-semibold'}>
          {formatMoney(actual)} / {formatMoney(budgeted)}
        </span>
      </div>
      <div className="h-1.5 bg-[#0F1117] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-[#A8FF3E]'}`}
          style={{ width: `${pct(actual, budgeted)}%` }}
        />
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)
  const [expandedStage, setExpandedStage] = useState<number | null>(null)
  const [clientEmail, setClientEmail] = useState('')
  const [startDate, setStartDate] = useState('')
  const [savingDate, setSavingDate] = useState(false)

  // Milestone dates per stage
  const [milestoneDates, setMilestoneDates] = useState<Record<string, { scheduled?: string; completed?: string }>>({})
  const [savingMilestone, setSavingMilestone] = useState<string | null>(null)

  // Live financial data for execution dashboard
  const [budgetMat, setBudgetMat] = useState(0)
  const [budgetLabor, setBudgetLabor] = useState(0)
  const [budgetOther, setBudgetOther] = useState(0)
  const [actualMat, setActualMat] = useState(0)
  const [actualLabor, setActualLabor] = useState(0)
  const [actualOther, setActualOther] = useState(0)
  const [checklistTotal, setChecklistTotal] = useState(0)
  const [checklistDone, setChecklistDone] = useState(0)

  const router = useRouter()
  const { lang } = useI18n()
  const { canSeeFinancials } = useProfile()
  const { canSeeProfit, canSeeContractTotal } = usePermissions()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single()
      const j = data as Job
      setJob(j)
      setClientEmail(j?.client_email || '')
      setStartDate(j?.start_date || '')

      // If approved, load financial data for execution dashboard
      if (j?.client_status === 'approved' || j?.status === 'approved' || j?.status === 'in_progress') {
        // Budget from estimate items
        const { data: items } = await supabase.from('estimate_items').select('*').eq('job_id', id)
        if (items && items.length > 0) {
          const typed = items as { category: string; quantity: number; unit_price: number }[]
          setBudgetMat(typed.filter((i) => i.category === 'material').reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))
          setBudgetLabor(typed.filter((i) => i.category === 'labor').reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))
          setBudgetOther(typed.filter((i) => i.category === 'other').reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))
        } else {
          // Fallback: simple mode budget buckets
          setBudgetMat(Number(j.simple_materials_budget) || 0)
          setBudgetLabor(Number(j.simple_labor_budget) || 0)
          setBudgetOther(Number(j.simple_other_budget) || 0)
        }

        // Actual: materials from checklist actual_cost
        const { data: checklist } = await supabase.from('material_checklist').select('*').eq('job_id', id)
        if (checklist) {
          const typed = checklist as { actual_cost: number | null; is_checked: boolean }[]
          setActualMat(typed.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0))
          setChecklistTotal(typed.length)
          setChecklistDone(typed.filter((c) => c.is_checked).length)
        }

        // Actual: labor from time entries
        const { data: te } = await supabase.from('time_entries').select('*').eq('job_id', id)
        if (te) {
          setActualLabor((te as { hours: number; hourly_rate: number }[]).reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0))
        }

        // Actual: other from expenses
        const { data: exp } = await supabase.from('expenses').select('*').eq('job_id', id)
        if (exp) {
          setActualOther((exp as { amount: number }[]).reduce((s, e) => s + Number(e.amount), 0))
        }
      }

      // Load milestone dates
      const { data: milestones } = await supabase
        .from('job_milestones')
        .select('stage, scheduled_date, completed_date')
        .eq('job_id', id)
      if (milestones) {
        const map: Record<string, { scheduled?: string; completed?: string }> = {}
        ;(milestones as { stage: string; scheduled_date?: string; completed_date?: string }[]).forEach((m) => {
          map[m.stage] = { scheduled: m.scheduled_date || '', completed: m.completed_date || '' }
        })
        setMilestoneDates(map)
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleDelete() {
    if (!confirm(lang === 'es' ? '¿Borrar este trabajo?' : 'Delete this job?')) return
    await supabase.from('jobs').delete().eq('id', id)
    toast.success(lang === 'es' ? 'Trabajo borrado' : 'Job deleted')
    router.push('/jobs')
  }

  async function handleSaveStartDate() {
    if (!startDate) return
    setSavingDate(true)
    await supabase.from('jobs').update({ start_date: startDate, updated_at: new Date().toISOString() }).eq('id', id)
    setJob((j) => j ? { ...j, start_date: startDate } : j)
    setSavingDate(false)
    toast.success(lang === 'es' ? 'Fecha guardada' : 'Date saved')
  }

  async function saveMilestone(stage: string, field: 'scheduled_date' | 'completed_date', value: string, orgId: string | null) {
    setSavingMilestone(stage)
    try {
      const payload = { job_id: id, organization_id: orgId, stage, [field]: value || null, updated_at: new Date().toISOString() }
      const { error } = await supabase
        .from('job_milestones')
        .upsert(payload, { onConflict: 'job_id,stage' })
      if (error) throw error
      setMilestoneDates((prev) => ({ ...prev, [stage]: { ...prev[stage], [field === 'scheduled_date' ? 'scheduled' : 'completed']: value } }))
      toast.success(lang === 'es' ? 'Fecha guardada' : 'Date saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSavingMilestone(null)
    }
  }

  function getProposalUrl() {
    if (!job?.public_token) return null
    return `${window.location.origin}/proposal/${job.public_token}`
  }

  function handleCopyLink() {
    const url = getProposalUrl()
    if (!url) { toast.error(lang === 'es' ? 'Guardá el presupuesto primero' : 'Save the estimate first'); return }
    navigator.clipboard.writeText(url)
    toast.success(lang === 'es' ? '¡Link copiado!' : 'Link copied!')
  }

  function buildNotifyMessage() {
    const dateStr = startDate
      ? new Date(startDate + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : ''
    return lang === 'es'
      ? `Hola ${job?.client_name}, te confirmo que arrancamos tu techo el ${dateStr}. Cualquier consulta avisá. ¡Gracias!`
      : `Hi ${job?.client_name}, I'm confirming we'll start your roofing job on ${dateStr}. Let me know if you have any questions. Thanks!`
  }

  function handleNotifyViaSMS() {
    const msg = buildNotifyMessage()
    const phone = job?.client_phone?.replace(/\D/g, '') || ''
    if (phone) {
      window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_blank')
    } else {
      const subject = encodeURIComponent(lang === 'es' ? 'Fecha de inicio de tu techo' : 'Start date for your roof')
      window.open(`mailto:${job?.client_email}?subject=${subject}&body=${encodeURIComponent(msg)}`, '_blank')
    }
    setShowContactModal(false)
  }

  function handleNotifyViaWhatsApp() {
    const msg = buildNotifyMessage()
    const phone = job?.client_phone?.replace(/\D/g, '') || ''
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    } else {
      toast.error(lang === 'es' ? 'No hay número de teléfono registrado' : 'No phone number on file')
    }
    setShowContactModal(false)
  }

  function handleNotifyClient() {
    if (!startDate) { toast.error(lang === 'es' ? 'Elegí una fecha primero' : 'Pick a date first'); return }
    setShowContactModal(true)
  }

  function handleSendToClient() {
    const url = getProposalUrl()
    if (!url) { toast.error(lang === 'es' ? 'Guardá el presupuesto primero' : 'Save the estimate first'); return }
    const subject = encodeURIComponent(lang === 'es' ? `Presupuesto - ${job?.client_name}` : `Estimate - ${job?.client_name}`)
    const body = encodeURIComponent(
      lang === 'es'
        ? `Hola ${job?.client_name},\n\nAcá podés ver y aprobar tu presupuesto:\n${url}\n\n¡Gracias!`
        : `Hi ${job?.client_name},\n\nYou can view and approve your estimate here:\n${url}\n\nThanks!`
    )
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, '_blank')
    setShowSendDialog(false)
    toast.success(lang === 'es' ? 'Se abrió tu app de email' : 'Email app opened')
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

  const isApproved = job.client_status === 'approved'
  const jt = JOB_TYPE_OPTIONS.find((o) => o.value === job.job_type)
  const rt = ROOF_TYPE_OPTIONS.find((o) => o.value === job.roof_type)

  const totalBudget = budgetMat + budgetLabor + budgetOther
  const totalActual = actualMat + actualLabor + actualOther
  const liveProfit = Number(job.estimated_total) - totalActual
  const liveProfitPct = Number(job.estimated_total) > 0 ? (liveProfit / Number(job.estimated_total)) * 100 : 0

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      <div className="w-full max-w-[430px] mx-auto px-5 pt-12 pb-4">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] mb-4 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {lang === 'es' ? 'Trabajos' : 'Jobs'}
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {job.job_number && (
                <span className="text-xs font-mono font-bold text-[#A8FF3E] bg-[#A8FF3E]/10 px-2 py-0.5 rounded-md">
                  {formatJobNumber(job.job_number)}
                </span>
              )}
              <h1 className="text-[26px] font-bold text-white leading-tight truncate">{job.client_name}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {isApproved ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8FF3E] bg-[#A8FF3E]/10 px-2 py-0.5 rounded-full">
                  <HardHat className="h-3 w-3" />
                  {lang === 'es' ? 'En Proceso' : 'In Progress'}
                </span>
              ) : (
                <span className="text-xs font-medium text-[#6B7280]">
                  {lang === 'es' ? 'Lead / Pendiente' : 'Lead / Pending'}
                </span>
              )}
            </div>
          </div>
          {canSeeContractTotal && Number(job.estimated_total) > 0 && (
            <p className="text-xl font-bold text-white tabular-nums ml-3">
              {formatMoney(Number(job.estimated_total))}
            </p>
          )}
        </div>
      </div>

      <div className="w-full max-w-[430px] mx-auto px-5 space-y-4">
        {/* Info strip */}
        <p className="text-[13px] text-[#6B7280]">
          {lang === 'es' ? jt?.label_es : jt?.label_en}
          {rt && ` · ${lang === 'es' ? rt.label_es : rt.label_en}`}
          {Number(job.square_footage) > 0 && ` · ${job.square_footage} ft²`}
        </p>

        {/* Map */}
        {job.client_address && (
          <div className="rounded-lg overflow-hidden border border-[#2A2D35]" style={{ height: 110 }}>
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(job.client_address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%" height="110" style={{ border: 0 }}
              allowFullScreen={false} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {/* Client contact */}
        <div className="space-y-1.5">
          {job.client_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-[#6B7280]" />
              <a href={`tel:${job.client_phone}`} className="text-[#A8FF3E] hover:underline">{job.client_phone}</a>
            </div>
          )}
          {job.client_address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-[#6B7280]" />
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.client_address)}`} target="_blank" rel="noopener noreferrer" className="text-[#A8FF3E] hover:underline truncate">{job.client_address}</a>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            PRE-APPROVAL MODE — Selling Phase
        ═══════════════════════════════════════════ */}
        {!isApproved && (
          <>
            {/* Estimate action card */}
            <Link href={`/jobs/${id}/estimate`}>
              <div className="bg-[#1E2228] border-l-4 border-[#A8FF3E] rounded-[12px] p-4 flex items-center gap-4 hover:bg-[#252830] transition-all cursor-pointer">
                <FileText className="h-8 w-8 text-[#A8FF3E] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">
                    {lang === 'es' ? 'Presupuesto' : 'Estimate'}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    {lang === 'es' ? 'Crear o editar el presupuesto' : 'Create or edit the estimate'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#6B7280]" />
              </div>
            </Link>

            {/* Send to client */}
            {Number(job.estimated_total) > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSendDialog(true)}
                  className="flex-1 h-12 rounded-[8px] btn-lime font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {lang === 'es' ? 'Enviar al cliente' : 'Send to client'}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="h-12 px-4 rounded-[8px] border border-[#2A2D35] bg-transparent text-[#6B7280] hover:bg-[#1E2228] transition-colors"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════
            POST-APPROVAL MODE — Execution Phase
        ═══════════════════════════════════════════ */}
        {isApproved && (
          <>
            {/* ── Prominent "View Contract" CTA ── */}
            <div className="flex gap-2">
              <Link
                href={job.public_token ? `/proposal/${job.public_token}` : `/jobs/${id}/estimate`}
                target={job.public_token ? '_blank' : undefined}
                rel={job.public_token ? 'noopener noreferrer' : undefined}
                className="flex-1"
              >
                <button className="w-full h-12 rounded-[10px] bg-[#A8FF3E] text-[#0F1117] font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                  <FileText className="h-4 w-4" />
                  {lang === 'es' ? 'Ver Contrato Aprobado' : 'View Approved Contract'}
                </button>
              </Link>
              {job.public_token && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/proposal/${job.public_token}`
                    navigator.clipboard.writeText(url)
                    toast.success(lang === 'es' ? '¡Link copiado!' : 'Link copied!')
                  }}
                  className="h-12 px-4 rounded-[10px] border border-[#2A2D35] bg-transparent text-[#6B7280] hover:bg-[#1E2228] hover:text-[#A8FF3E] transition-colors flex items-center justify-center"
                  title={lang === 'es' ? 'Copiar link del contrato' : 'Copy contract link'}
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Signed contract meta card */}
            <div className="bg-[#1E2228] rounded-[12px] overflow-hidden border border-[#A8FF3E]/30">
              <div className="h-1 bg-[#A8FF3E]" />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#A8FF3E]" />
                  <h3 className="text-sm font-bold text-white">{lang === 'es' ? 'Contrato Firmado' : 'Signed Contract'}</h3>
                  <span className="ml-auto text-xs text-[#6B7280]">
                    {job.approved_at ? new Date(job.approved_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                </div>
                {job.client_signature && (
                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF] bg-[#0F1117] rounded-[8px] px-3 py-2">
                    <CalendarCheck className="h-3.5 w-3.5 text-[#A8FF3E]" />
                    <span>{lang === 'es' ? 'Firmado por: ' : 'Signed by: '}{job.client_signature}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/jobs/${id}/estimate`}
                    className="flex items-center gap-1.5 text-xs text-[#A8FF3E] hover:underline font-medium"
                  >
                    <Lock className="h-3 w-3" />
                    {lang === 'es' ? 'Vista interna (solo lectura)' : 'Internal view (read only)'}
                  </Link>
                  {job.public_token && (
                    <Link
                      href={`/proposal/${job.public_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#A8FF3E] hover:underline font-medium transition-colors"
                    >
                      <Link2 className="h-3 w-3" />
                      {lang === 'es' ? 'Link público' : 'Public link'}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* ── Unified Milestone Tracker ── */}
            {(() => {
              const currentStage = job.workflow_stage || 'approved'
              const STAGES = [
                { key: 'contract',   wfKey: 'approved',          icon: ClipboardList,    label_es: 'Contrato',   label_en: 'Contract'  },
                { key: 'materials',  wfKey: 'materials_ordered',  icon: HardDriveDownload, label_es: 'Materiales', label_en: 'Materials' },
                { key: 'jobsite',    wfKey: 'in_progress',       icon: Wrench,           label_es: 'En Obra',    label_en: 'Job Site'  },
                { key: 'completed',  wfKey: 'completed',         icon: Flag,             label_es: 'Finalizado', label_en: 'Finished'  },
              ]
              const stepIndex = currentStage === 'completed' || currentStage === 'invoiced' || currentStage === 'paid' ? 3
                : currentStage === 'in_progress' ? 2
                : currentStage === 'materials_ordered' ? 1
                : 0

              return (
                <div className="bg-[#1E2228] rounded-[14px] border border-[#2A2D35] overflow-hidden">
                  {/* Collapsible header */}
                  <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#252830] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#A8FF3E]" />
                      <span className="text-sm font-bold text-white">
                        {lang === 'es' ? 'Cronograma de Obra' : 'Milestone Tracker'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#A8FF3E] font-semibold">
                        {lang === 'es' ? STAGES[stepIndex].label_es : STAGES[stepIndex].label_en}
                      </span>
                      {showTimeline ? <ChevronUp className="h-4 w-4 text-[#6B7280]" /> : <ChevronDown className="h-4 w-4 text-[#6B7280]" />}
                    </div>
                  </button>

                  {/* Always-visible progress bar */}
                  <div className="px-4 pb-3">
                    <div className="flex items-center">
                      {STAGES.map((s, i) => {
                        const done = i < stepIndex
                        const active = i === stepIndex
                        const Icon = s.icon
                        return (
                          <div key={s.key} className="flex items-center flex-1 min-w-0">
                            <div className="flex flex-col items-center flex-shrink-0">
                              <button
                                onClick={() => setExpandedStage(showTimeline && expandedStage === i ? null : i)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  active  ? 'bg-[#A8FF3E] text-[#0F1117] ring-2 ring-[#A8FF3E]/40'
                                  : done  ? 'bg-[#A8FF3E]/20 text-[#A8FF3E]'
                                  :         'bg-[#0F1117] text-[#4B5563] border border-[#2A2D35]'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                              <span className={`mt-1 text-[10px] font-semibold text-center leading-tight max-w-[56px] ${
                                active ? 'text-[#A8FF3E]' : done ? 'text-[#9CA3AF]' : 'text-[#4B5563]'
                              }`}>
                                {lang === 'es' ? s.label_es : s.label_en}
                              </span>
                            </div>
                            {i < STAGES.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all ${
                                i < stepIndex ? 'bg-[#A8FF3E]' : 'bg-[#2A2D35]'
                              }`} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Accordion detail rows */}
                  {showTimeline && (
                    <div className="border-t border-[#2A2D35]">
                      {STAGES.map((s, i) => {
                        const isActive = i === stepIndex
                        const isFinished = i < stepIndex
                        const md = milestoneDates[s.key] || {}
                        const open = expandedStage === i

                        return (
                          <div key={s.key} className={`border-b border-[#2A2D35] last:border-b-0 ${isActive ? 'bg-[#A8FF3E]/5' : ''}`}>
                            <button
                              onClick={() => setExpandedStage(open ? null : i)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#252830] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isActive ? 'bg-[#A8FF3E] text-[#0F1117]'
                                  : isFinished ? 'bg-[#A8FF3E]/20 text-[#A8FF3E]'
                                  : 'bg-[#0F1117] text-[#4B5563] border border-[#2A2D35]'
                                }`}>
                                  <s.icon className="h-3 w-3" />
                                </div>
                                <div className="text-left">
                                  <p className={`text-sm font-semibold ${isActive ? 'text-[#A8FF3E]' : 'text-white'}`}>
                                    {lang === 'es' ? s.label_es : s.label_en}
                                  </p>
                                  {md.scheduled && (
                                    <p className="text-[11px] text-[#6B7280]">
                                      {lang === 'es' ? 'Prog: ' : 'Sched: '}
                                      {new Date(md.scheduled + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isActive && (
                                  <span className="text-[10px] bg-[#A8FF3E] text-[#0F1117] font-bold px-2 py-0.5 rounded-full">
                                    {lang === 'es' ? 'ACTUAL' : 'CURRENT'}
                                  </span>
                                )}
                                {open ? <ChevronUp className="h-4 w-4 text-[#6B7280]" /> : <ChevronDown className="h-4 w-4 text-[#6B7280]" />}
                              </div>
                            </button>

                            {open && (
                              <div className="px-4 pb-4 space-y-3">
                                {isFinished ? (
                                  /* Finished stage — show completion info */
                                  <div className="flex items-center gap-2 text-sm text-[#9CA3AF] bg-[#0F1117] rounded-xl px-3 py-2.5">
                                    <CheckCircle className="h-4 w-4 text-[#A8FF3E]" />
                                    {md.completed
                                      ? `${lang === 'es' ? 'Completado el' : 'Completed on'} ${new Date(md.completed + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                                      : (lang === 'es' ? 'Etapa completada' : 'Stage completed')}
                                  </div>
                                ) : (
                                  /* Not finished — show date pickers + notify button */
                                  <>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <p className="text-[11px] text-[#6B7280] font-medium uppercase">
                                          {lang === 'es' ? 'Fecha programada' : 'Scheduled date'}
                                        </p>
                                        <div className="flex gap-1.5">
                                          <input
                                            type="date"
                                            defaultValue={md.scheduled || ''}
                                            onChange={(e) => setMilestoneDates(prev => ({
                                              ...prev, [s.key]: { ...prev[s.key], scheduled: e.target.value }
                                            }))}
                                            className="flex-1 h-9 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-2 text-white text-xs focus:outline-none focus:border-[#A8FF3E] transition-colors"
                                          />
                                          <button
                                            onClick={() => saveMilestone(s.key, 'scheduled_date', md.scheduled || '', job.organization_id)}
                                            disabled={savingMilestone === s.key}
                                            className="h-9 px-2.5 rounded-lg bg-[#A8FF3E] text-[#0F1117] text-xs font-bold disabled:opacity-50"
                                          >
                                            {savingMilestone === s.key ? '…' : lang === 'es' ? 'Ok' : 'Ok'}
                                          </button>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[11px] text-[#6B7280] font-medium uppercase">
                                          {lang === 'es' ? 'Fecha real' : 'Completion date'}
                                        </p>
                                        <div className="flex gap-1.5">
                                          <input
                                            type="date"
                                            defaultValue={md.completed || ''}
                                            onChange={(e) => setMilestoneDates(prev => ({
                                              ...prev, [s.key]: { ...prev[s.key], completed: e.target.value }
                                            }))}
                                            className="flex-1 h-9 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-2 text-white text-xs focus:outline-none focus:border-[#A8FF3E] transition-colors"
                                          />
                                          <button
                                            onClick={() => saveMilestone(s.key, 'completed_date', md.completed || '', job.organization_id)}
                                            disabled={savingMilestone === s.key}
                                            className="h-9 px-2.5 rounded-lg border border-[#2A2D35] text-[#6B7280] text-xs font-bold disabled:opacity-50 hover:bg-[#252830]"
                                          >
                                            {savingMilestone === s.key ? '…' : '✓'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Notify client button */}
                                    <button
                                      onClick={() => {
                                        const dateStr = md.scheduled
                                          ? new Date(md.scheduled + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                          : ''
                                        const stageLabel = lang === 'es' ? s.label_es : s.label_en
                                        const msg = lang === 'es'
                                          ? `Hola ${job.client_name}, te informamos que la etapa "${stageLabel}" está programada para el ${dateStr}. ¡Gracias!`
                                          : `Hi ${job.client_name}, we're letting you know the "${stageLabel}" milestone is scheduled for ${dateStr}. Thank you!`
                                        const phone = job.client_phone?.replace(/\D/g, '') || ''
                                        setStartDate(md.scheduled || '')
                                        // Build SMS or WhatsApp — open contact modal
                                        if (phone) {
                                          window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_blank')
                                        } else {
                                          window.open(`mailto:${job.client_email}?subject=${encodeURIComponent(stageLabel)}&body=${encodeURIComponent(msg)}`, '_blank')
                                        }
                                      }}
                                      disabled={!md.scheduled}
                                      className="w-full h-10 rounded-xl border border-[#2A2D35] bg-transparent text-sm text-white flex items-center justify-center gap-2 hover:bg-[#252830] disabled:opacity-40 transition-colors"
                                    >
                                      <MessageCircle className="h-4 w-4 text-[#A8FF3E]" />
                                      {lang === 'es' ? 'Notificar cliente' : 'Notify client'}
                                    </button>

                                    {/* Advance workflow stage button */}
                                    {!isFinished && i >= stepIndex && (
                                      <button
                                        onClick={async () => {
                                          const newStage = s.wfKey as import('@/lib/types').WorkflowStage
                                          const { error } = await supabase
                                            .from('jobs')
                                            .update({ workflow_stage: newStage, updated_at: new Date().toISOString() })
                                            .eq('id', id)
                                          if (!error) {
                                            setJob(j => j ? { ...j, workflow_stage: newStage } : j)
                                            toast.success(lang === 'es' ? '¡Etapa avanzada!' : 'Stage advanced!')
                                            setExpandedStage(null)
                                          } else {
                                            toast.error(error.message)
                                          }
                                        }}
                                        className={`w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                                          isActive
                                            ? 'bg-[#0F1117] border border-[#A8FF3E]/40 text-[#A8FF3E] hover:bg-[#A8FF3E]/5'
                                            : 'border border-[#2A2D35] text-[#6B7280] hover:bg-[#252830]'
                                        }`}
                                      >
                                        {lang === 'es' ? `Marcar "${s.label_es}" como actual` : `Set "${s.label_en}" as current stage`}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Material checklist summary */}
            <Link href={`/jobs/${id}/checklist`}>
              <div className="bg-[#1E2228] rounded-[12px] border border-[#2A2D35] p-4 flex items-center gap-4 hover:bg-[#252830] transition-all cursor-pointer">
                <div className="relative flex-shrink-0">
                  <Package className="h-8 w-8 text-[#A8FF3E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">{lang === 'es' ? 'Materiales' : 'Materials'}</p>
                  {checklistTotal > 0 ? (
                    <div className="mt-1 space-y-1">
                      <div className="flex justify-between text-xs text-[#6B7280]">
                        <span>{checklistDone}/{checklistTotal} {lang === 'es' ? 'comprados' : 'purchased'}</span>
                      </div>
                      <div className="h-1.5 bg-[#0F1117] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#A8FF3E] transition-all" style={{ width: `${pct(checklistDone, checklistTotal)}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#6B7280]">{lang === 'es' ? 'Generar checklist de compra' : 'Generate purchase checklist'}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-[#6B7280]" />
              </div>
            </Link>

            {/* Budget vs Actual Tracker — all roles see costs, only owners see profit row */}
            <div className="bg-[#1E2228] rounded-[12px] overflow-hidden border border-[#2A2D35]">
              <div className="h-1 bg-[#A8FF3E]" />
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#A8FF3E]" />
                    <h3 className="text-sm font-bold text-white">{lang === 'es' ? 'Presupuesto vs Real' : 'Budget vs Actual'}</h3>
                  </div>
                  <Link href={`/jobs/${id}/results`} className="text-[11px] text-[#A8FF3E] hover:underline">
                    {lang === 'es' ? 'Ver detalle' : 'View detail'}
                  </Link>
                </div>

                {totalBudget > 0 ? (
                  <>
                    <BudgetBar label={lang === 'es' ? 'Materiales' : 'Materials'} budgeted={budgetMat} actual={actualMat} lang={lang} />
                    <BudgetBar label={lang === 'es' ? 'Mano de obra' : 'Labor'} budgeted={budgetLabor} actual={actualLabor} lang={lang} />
                    {(budgetOther > 0 || actualOther > 0) && (
                      <BudgetBar label={lang === 'es' ? 'Otros gastos' : 'Other expenses'} budgeted={budgetOther} actual={actualOther} lang={lang} />
                    )}

                    {canSeeProfit && (
                      <div className="pt-2 border-t border-[#2A2D35]">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6B7280]">{lang === 'es' ? 'Ganancia proyectada' : 'Projected profit'}</span>
                          <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${liveProfit >= 0 ? 'text-[#A8FF3E]' : 'text-red-400'}`}>
                            {liveProfit >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {formatMoney(Math.abs(liveProfit))}
                            <span className="text-xs font-normal">({liveProfitPct.toFixed(0)}%)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <AlertCircle className="h-4 w-4" />
                    {lang === 'es' ? 'Guardá el presupuesto con buckets de costos para ver el tracker' : 'Save the estimate with cost buckets to see the tracker'}
                  </div>
                )}
              </div>
            </div>

            {/* Execution action cards */}
            <div className="space-y-2">
              {[
                { href: `/jobs/${id}/timetrack`, icon: Clock, title_es: 'Horas y Gastos', title_en: 'Time & Expenses', desc_es: 'Registrar horas del crew y gastos', desc_en: 'Log crew hours and expenses' },
                { href: `/jobs/${id}/results`, icon: BarChart3, title_es: 'Resultados', title_en: 'Results', desc_es: 'Ver análisis final del trabajo', desc_en: 'View final job analysis' },
              ].map((s) => (
                <Link key={s.href} href={s.href}>
                  <div className="bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-4 flex items-center gap-4 hover:bg-[#252830] transition-all cursor-pointer">
                    <s.icon className="h-7 w-7 text-[#A8FF3E] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-white">{lang === 'es' ? s.title_es : s.title_en}</p>
                      <p className="text-[13px] text-[#6B7280]">{lang === 'es' ? s.desc_es : s.desc_en}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#6B7280]" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Checklist & Timetrack always visible in pre-approval (for preparation) */}
        {!isApproved && (
          <div className="space-y-2">
            {[
              { href: `/jobs/${id}/checklist`, icon: CheckSquare, title_es: 'Checklist', title_en: 'Checklist', desc_es: 'Lista de materiales', desc_en: 'Materials list' },
              { href: `/jobs/${id}/timetrack`, icon: Clock, title_es: 'Horas / Gastos', title_en: 'Time / Expenses', desc_es: 'Registro de horas y gastos', desc_en: 'Time and expense log' },
              { href: `/jobs/${id}/results`, icon: BarChart3, title_es: 'Resultados', title_en: 'Results', desc_es: 'Análisis del trabajo', desc_en: 'Job analysis' },
            ].map((s) => (
              <Link key={s.href} href={s.href}>
                <div className="bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-4 flex items-center gap-4 hover:bg-[#252830] transition-all cursor-pointer">
                  <s.icon className="h-7 w-7 text-[#6B7280] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white">{lang === 'es' ? s.title_es : s.title_en}</p>
                    <p className="text-[13px] text-[#6B7280]">{lang === 'es' ? s.desc_es : s.desc_en}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#6B7280]" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="w-full py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-[8px] transition-all flex items-center justify-center gap-2 bg-transparent border-none"
        >
          <Trash2 className="h-4 w-4" />
          {lang === 'es' ? 'Borrar trabajo' : 'Delete job'}
        </button>
      </div>

      {/* Send dialog */}
      {showSendDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSendDialog(false)} />
          <div className="relative bg-[#1E2228] rounded-t-2xl sm:rounded-[12px] w-full sm:max-w-md p-6 pb-8 space-y-4 shadow-xl border border-[#2A2D35]">
            <h3 className="text-lg font-semibold text-white">{lang === 'es' ? 'Enviar presupuesto' : 'Send estimate'}</h3>
            <div className="space-y-2">
              <label className="text-[#6B7280] text-sm block">{lang === 'es' ? 'Email del cliente' : 'Client email'}</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com"
                className="w-full h-12 rounded-[8px] bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#6B7280] focus:outline-none focus:border-[#A8FF3E] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#6B7280] text-sm block">{lang === 'es' ? 'Link de propuesta' : 'Proposal link'}</label>
              {getProposalUrl() ? (
                <div className="flex gap-2">
                  <input readOnly value={getProposalUrl()!} className="flex-1 h-10 rounded-[8px] bg-[#0F1117] border border-[#2A2D35] px-3 text-xs text-[#A8FF3E] focus:outline-none" />
                  <button onClick={handleCopyLink} className="h-10 px-3 rounded-[8px] border border-[#2A2D35] bg-transparent text-[#6B7280] hover:bg-[#252830]"><Copy className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-[8px] px-3 py-2">
                  {lang === 'es' ? 'Abrí el presupuesto y guardalo para generar el link.' : 'Open the estimate and save it to generate the link.'}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowSendDialog(false)} className="flex-1 h-12 rounded-[8px] border border-[#2A2D35] bg-transparent text-[#6B7280] text-sm font-medium hover:bg-[#252830]">
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={handleSendToClient} disabled={!clientEmail} className="flex-1 h-12 rounded-[8px] btn-lime font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <Send className="h-4 w-4" />
                {lang === 'es' ? 'Enviar' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SMS / WhatsApp contact modal ──────────────────────────────── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContactModal(false)} />
          <div className="relative bg-[#1E2228] rounded-t-2xl sm:rounded-[12px] w-full sm:max-w-sm p-6 pb-8 space-y-4 shadow-xl border border-[#2A2D35]">
            <h3 className="text-base font-bold text-white">
              {lang === 'es' ? 'Notificar al cliente' : 'Notify client'}
            </h3>
            <p className="text-xs text-[#6B7280]">
              {lang === 'es' ? '¿Cómo querés enviar el mensaje?' : 'How would you like to send the message?'}
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={handleNotifyViaSMS}
                className="w-full h-13 py-3.5 rounded-xl border border-[#2A2D35] bg-[#16191F] text-white font-semibold text-sm flex items-center justify-center gap-3 hover:bg-[#252830] transition-colors"
              >
                <Smartphone className="h-5 w-5 text-[#A8FF3E]" />
                {lang === 'es' ? 'Enviar SMS / Texto' : 'Send SMS / Text'}
              </button>
              <button
                onClick={handleNotifyViaWhatsApp}
                className="w-full h-13 py-3.5 rounded-xl border border-[#2A2D35] bg-[#16191F] text-white font-semibold text-sm flex items-center justify-center gap-3 hover:bg-[#252830] transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
                WhatsApp
              </button>
              <button
                onClick={() => setShowContactModal(false)}
                className="w-full h-11 rounded-xl bg-transparent text-[#6B7280] text-sm hover:text-white transition-colors"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppHeader />
      <MobileNav />
    </div>
  )
}
