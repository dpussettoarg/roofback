'use client'

export const dynamic = 'force-dynamic'

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
  Smartphone, MessageCircle,
  BookOpen, DollarSign, FileEdit, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TYPE_OPTIONS, ROOF_TYPE_OPTIONS } from '@/lib/templates'
import { formatJobNumber } from '@/lib/types'
import { useProfile } from '@/lib/hooks/useProfile'
import { usePermissions } from '@/lib/hooks/usePermissions'
import type { Job, PaymentCheckpoint, ChangeOrder } from '@/lib/types'
import { ChangeOrderModal } from '@/components/app/change-order-modal'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function pct(actual: number, budget: number) {
  if (!budget) return 0
  return Math.min((actual / budget) * 100, 100)
}

function BudgetBar({
  label, budgeted, actual,
}: { label: string; budgeted: number; actual: number }) {
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
  const [clientEmail, setClientEmail] = useState('')
  const [startDate, setStartDate] = useState('')

  // Milestone dates per stage (summary only — full tracker is at /tracking)
  const [milestoneDates, setMilestoneDates] = useState<Record<string, { scheduled?: string; completed?: string }>>({})

  // Live financial data for execution dashboard
  const [budgetMat, setBudgetMat] = useState(0)
  const [budgetLabor, setBudgetLabor] = useState(0)
  const [budgetOther, setBudgetOther] = useState(0)
  const [actualMat, setActualMat] = useState(0)
  const [actualLabor, setActualLabor] = useState(0)
  const [actualOther, setActualOther] = useState(0)
  const [checklistTotal, setChecklistTotal] = useState(0)
  const [checklistDone, setChecklistDone] = useState(0)
  const [paymentCheckpoints, setPaymentCheckpoints] = useState<PaymentCheckpoint[]>([
    { id: 'deposit', checked: false, date: null },
    { id: 'progress', checked: false, date: null },
    { id: 'final', checked: false, date: null },
  ])
  const [savingPaymentCheckpoint, setSavingPaymentCheckpoint] = useState<string | null>(null)
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false)

  const router = useRouter()
  const { profile } = useProfile()
  const { lang } = useI18n()
  const { canSeeProfit, canSeeContractTotal } = usePermissions()
  const supabase = createClient()

  function loadFinancials(j: Job | null) {
    if (!j || !(j.client_status === 'approved' || j.status === 'approved' || j.status === 'in_progress')) return
    const load = async () => {
      const { data: items } = await supabase.from('estimate_items').select('*').eq('job_id', id)
      if (items && items.length > 0) {
        const typed = items as { category: string; quantity: number; unit_price: number }[]
        setBudgetMat(typed.filter((i) => i.category === 'material').reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))
        setBudgetLabor(typed.filter((i) => i.category === 'labor').reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))
        setBudgetOther(typed.filter((i) => i.category === 'other').reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))
      } else {
        setBudgetMat(Number(j.simple_materials_budget) || 0)
        setBudgetLabor(Number(j.simple_labor_budget) || 0)
        setBudgetOther(Number(j.simple_other_budget) || 0)
      }
      const { data: checklist } = await supabase.from('material_checklist').select('*').eq('job_id', id)
      if (checklist) {
        const typed = checklist as { actual_cost: number | null; is_checked: boolean }[]
        setActualMat(typed.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0))
        setChecklistTotal(typed.length)
        setChecklistDone(typed.filter((c) => c.is_checked).length)
      }
      const { data: te } = await supabase.from('time_entries').select('*').eq('job_id', id)
      if (te) {
        setActualLabor((te as { hours: number; hourly_rate: number }[]).reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0))
      }
      const { data: exp } = await supabase.from('expenses').select('*').eq('job_id', id)
      if (exp) {
        setActualOther((exp as { amount: number }[]).reduce((s, e) => s + Number(e.amount), 0))
      }
    }
    void load()
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single()
      const j = data as Job
      setJob(j)
      setClientEmail(j?.client_email || '')
      setStartDate(j?.start_date || '')
      const defaults: PaymentCheckpoint[] = [
        { id: 'deposit', checked: false, date: null },
        { id: 'progress', checked: false, date: null },
        { id: 'final', checked: false, date: null },
      ]
      const pts = (j?.payment_checkpoints as PaymentCheckpoint[] | null) || defaults
      setPaymentCheckpoints(Array.isArray(pts) && pts.length === 3 ? pts : defaults)
      loadFinancials(j)

      const { data: cos } = await supabase.from('change_orders').select('*').eq('job_id', id).order('created_at', { ascending: false })
      setChangeOrders((cos as ChangeOrder[]) || [])

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

  // Realtime: refetch financials when time_entries, expenses, material_checklist change
  useEffect(() => {
    const channel = supabase
      .channel(`job-financials-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries', filter: `job_id=eq.${id}` }, () => loadFinancials(job))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `job_id=eq.${id}` }, () => loadFinancials(job))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'material_checklist', filter: `job_id=eq.${id}` }, () => loadFinancials(job))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, job?.id])

  async function handleDelete() {
    if (!confirm(lang === 'es' ? '¿Borrar este trabajo?' : 'Delete this job?')) return
    await supabase.from('jobs').delete().eq('id', id)
    toast.success(lang === 'es' ? 'Trabajo borrado' : 'Job deleted')
    router.push('/jobs')
  }

  async function togglePaymentCheckpoint(cpId: PaymentCheckpoint['id']) {
    setSavingPaymentCheckpoint(cpId)
    try {
      const next = paymentCheckpoints.map((cp) =>
        cp.id === cpId
          ? { ...cp, checked: !cp.checked, date: !cp.checked ? new Date().toISOString() : null }
          : cp
      )
      const { error } = await supabase.from('jobs').update({
        payment_checkpoints: next,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
      setPaymentCheckpoints(next)
      toast.success(lang === 'es' ? 'Guardado' : 'Saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSavingPaymentCheckpoint(null)
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

  async function logActivity(note: string) {
    if (!job) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('job_activity_log').insert({
      job_id: job.id,
      user_id: user.id,
      log_type: 'note',
      note,
      created_at: new Date().toISOString(),
    })
  }

  async function handleSendToClient() {
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
    // Log the send action
    const jobNum = job?.job_number ? `#J${String(job.job_number).padStart(4, '0')}` : ''
    void logActivity(lang === 'es'
      ? `Cotización ${jobNum} enviada al cliente`
      : `Quote ${jobNum} sent to client`)
    // Mark as sent in workflow_stage
    if (job && job.workflow_stage !== 'sent' && job.workflow_stage !== 'approved') {
      await supabase.from('jobs').update({ workflow_stage: 'sent', updated_at: new Date().toISOString() }).eq('id', job.id)
      setJob(j => j ? { ...j, workflow_stage: 'sent' } : j)
    }
  }

  function handleFollowUp() {
    if (!job) return
    const jobNum = job.job_number ? `#J${String(job.job_number).padStart(4, '0')}` : ''
    const address = job.client_address || ''
    const msg = encodeURIComponent(
      `Hey, just checking in on the last quotation ${jobNum} for ${address}, let me know if we can do something else to move forward.`
    )
    const phone = job.client_phone?.replace(/\D/g, '') || ''
    if (phone) {
      window.open(`sms:${phone}?body=${msg}`, '_blank')
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(decodeURIComponent(msg))
      toast.success(lang === 'es' ? 'Mensaje copiado al portapapeles' : 'Message copied to clipboard')
    }
    void logActivity(lang === 'es'
      ? `Follow-up enviado para cotización ${jobNum}`
      : `Follow-up sent for quote ${jobNum}`)
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
  const originalTotal = Number(job.estimated_total) || 0
  const effectiveContractTotal = originalTotal + changeOrders
    .filter((co) => co.status === 'approved' || co.status === 'verbal')
    .reduce((s, co) => s + Number(co.amount), 0)
  const liveProfit = effectiveContractTotal - totalActual
  const liveProfitPct = effectiveContractTotal > 0 ? (liveProfit / effectiveContractTotal) * 100 : 0

  const sentCount = changeOrders.filter((co) => co.status === 'sent').length
  const verbalCount = changeOrders.filter((co) => co.status === 'verbal').length
  const approvedCount = changeOrders.filter((co) => co.status === 'approved').length
  const allApproved = changeOrders.length > 0 && changeOrders.every((co) => co.status === 'approved')

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
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
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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
              {sentCount > 0 && (
                <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                  {sentCount} {lang === 'es' ? 'orden(es) pendiente(s)' : 'change order(s) awaiting approval'}
                </span>
              )}
              {verbalCount > 0 && (
                <span className="text-xs font-medium text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                  {verbalCount} {lang === 'es' ? 'sin notificar' : '— client not notified'}
                </span>
              )}
              {allApproved && (
                <span className="text-xs font-medium text-[#A8FF3E]/80 bg-[#A8FF3E]/5 px-2 py-0.5 rounded-full">
                  {lang === 'es' ? 'Todas aprobadas' : 'All change orders approved'}
                </span>
              )}
            </div>
          </div>
          {canSeeContractTotal && effectiveContractTotal > 0 && (
            <div className="text-right ml-3">
              <p className="text-xl font-bold text-white tabular-nums">
                {changeOrders.filter((c) => c.status === 'approved' || c.status === 'verbal').length > 0
                  ? `${formatMoney(originalTotal)} + ${formatMoney(effectiveContractTotal - originalTotal)} = ${formatMoney(effectiveContractTotal)}`
                  : formatMoney(originalTotal)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
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
              <>
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

                {/* Follow-up button — shown only after quote was sent */}
                {(job.workflow_stage === 'sent') && (
                  <button
                    onClick={handleFollowUp}
                    className="w-full h-11 rounded-[8px] border border-[#F59E0B]/40 text-[#F59E0B] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#F59E0B]/5 transition-all"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {lang === 'es' ? 'Hacer seguimiento' : 'Send follow-up'}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════
            POST-APPROVAL MODE — Execution Phase
        ═══════════════════════════════════════════ */}
        {isApproved && (
          <>
            {/* ── SECCIÓN: CONTRATO ── */}
            <div className="flex items-center gap-2.5 pt-1">
              <div className="w-[3px] h-[14px] rounded-full bg-[#F97316]" />
              <span className="text-[10px] font-bold text-[#F97316] uppercase tracking-[0.14em]">
                {lang === 'es' ? 'Contrato' : 'Contract'}
              </span>
            </div>

            {/* View Contract CTA */}
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
            <div className="bg-[#1E2228] rounded-[12px] overflow-hidden border border-[#F97316]/20">
              <div className="h-[3px] bg-[#F97316]" />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#F97316]" />
                  <h3 className="text-sm font-bold text-white">{lang === 'es' ? 'Contrato Firmado' : 'Signed Contract'}</h3>
                  <span className="ml-auto text-xs text-[#6B7280]">
                    {job.approved_at ? new Date(job.approved_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                </div>
                {job.client_signature && (
                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF] bg-[#0F1117] rounded-[8px] px-3 py-2">
                    <CalendarCheck className="h-3.5 w-3.5 text-[#F97316]" />
                    <span>{lang === 'es' ? 'Firmado por: ' : 'Signed by: '}{job.client_signature}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/jobs/${id}/estimate`}
                    className="flex items-center gap-1.5 text-xs text-[#F97316] hover:underline font-medium"
                  >
                    <Lock className="h-3 w-3" />
                    {lang === 'es' ? 'Vista interna (solo lectura)' : 'Internal view (read only)'}
                  </Link>
                  {job.public_token && (
                    <Link
                      href={`/proposal/${job.public_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#F97316] hover:underline font-medium transition-colors"
                    >
                      <Link2 className="h-3 w-3" />
                      {lang === 'es' ? 'Link público' : 'Public link'}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Checkpoints */}
            <div className="flex flex-wrap items-center gap-2 py-3 px-4 rounded-xl bg-[#1E2228] border border-[#2A2D35]">
              <DollarSign className="h-4 w-4 text-[#F97316] flex-shrink-0" />
              {[
                { id: 'deposit' as const, label_es: 'Depósito', label_en: 'Deposit' },
                { id: 'progress' as const, label_es: 'Progreso', label_en: 'Progress Payment' },
                { id: 'final' as const, label_es: 'Final', label_en: 'Final Payment' },
              ].map(({ id: cpId, label_es, label_en }) => {
                const cp = paymentCheckpoints.find((p) => p.id === cpId)
                const checked = cp?.checked ?? false
                const date = cp?.date ? new Date(cp.date) : null
                return (
                  <button
                    key={cpId}
                    onClick={() => togglePaymentCheckpoint(cpId)}
                    disabled={savingPaymentCheckpoint === cpId}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      checked
                        ? 'bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40'
                        : 'bg-[#0F1117] text-[#6B7280] border border-[#2A2D35] hover:border-[#3A3D45]'
                    }`}
                  >
                    {checked ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-60" />}
                    <span>{lang === 'es' ? label_es : label_en}</span>
                    {checked && date && (
                      <span className="text-[10px] opacity-80">· {date.toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Red banner: final payment pending */}
            {job.workflow_stage === 'completed' && !paymentCheckpoints.find((p) => p.id === 'final')?.checked && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-semibold">
                  {lang === 'es' ? 'Pago final no confirmado' : 'Final payment not confirmed'}
                </span>
              </div>
            )}

            {/* Change Orders */}
            <div className="bg-[#1E2228] rounded-[12px] border border-[#2A2D35] overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileEdit className="h-5 w-5 text-[#F97316]" />
                  <h3 className="text-sm font-bold text-white">{lang === 'es' ? 'Órdenes de Cambio' : 'Change Orders'}</h3>
                </div>
                <button onClick={() => setShowChangeOrderModal(true)} className="flex items-center gap-1.5 text-xs font-semibold text-[#F97316] hover:underline">
                  <Plus className="h-3.5 w-3.5" /> {lang === 'es' ? 'Nueva' : 'New'}
                </button>
              </div>
              {changeOrders.length > 0 ? (
                <div className="border-t border-[#2A2D35] divide-y divide-[#2A2D35]">
                  {changeOrders.map((co) => (
                    <div key={co.id} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{co.description}</p>
                        <p className={`text-xs ${co.status === 'rejected' ? 'text-red-400 line-through' : 'text-[#6B7280]'}`}>
                          {formatMoney(Number(co.amount))}
                          {co.status === 'sent' && ` · ${lang === 'es' ? 'Pendiente' : 'Awaiting approval'}`}
                          {co.status === 'verbal' && ` · ${lang === 'es' ? 'Sin notificar' : 'Client not notified'}`}
                          {co.status === 'approved' && ` · ${lang === 'es' ? 'Aprobado' : 'Approved'}`}
                          {co.status === 'rejected' && ` · ${lang === 'es' ? 'Rechazado' : 'Rejected'}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 pb-4 text-xs text-[#6B7280]">{lang === 'es' ? 'Sin órdenes de cambio' : 'No change orders'}</p>
              )}
            </div>

            {/* ── SECCIÓN: MATERIALES ── */}
            <div className="flex items-center gap-2.5 pt-3">
              <div className="w-[3px] h-[14px] rounded-full bg-[#60A5FA]" />
              <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-[0.14em]">
                {lang === 'es' ? 'Materiales' : 'Materials'}
              </span>
            </div>

            {/* Material checklist summary */}
            <Link href={`/jobs/${id}/checklist`}>
              <div className="bg-[#1E2228] rounded-[12px] border border-[#2A2D35] p-4 flex items-center gap-4 hover:bg-[#252830] transition-all cursor-pointer">
                <Package className="h-8 w-8 text-[#60A5FA] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">{lang === 'es' ? 'Materiales' : 'Materials'}</p>
                  {checklistTotal > 0 ? (
                    <div className="mt-1 space-y-1">
                      <div className="flex justify-between text-xs text-[#6B7280]">
                        <span>{checklistDone}/{checklistTotal} {lang === 'es' ? 'comprados' : 'purchased'}</span>
                      </div>
                      <div className="h-1.5 bg-[#0F1117] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#60A5FA] transition-all" style={{ width: `${pct(checklistDone, checklistTotal)}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#6B7280]">{lang === 'es' ? 'Generar checklist de compra' : 'Generate purchase checklist'}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-[#6B7280]" />
              </div>
            </Link>

            {/* Budget vs Actual */}
            <div className="bg-[#1E2228] rounded-[12px] overflow-hidden border border-[#2A2D35]">
              <div className="h-[3px] bg-[#60A5FA]" />
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#60A5FA]" />
                    <h3 className="text-sm font-bold text-white">{lang === 'es' ? 'Presupuesto vs Real' : 'Budget vs Actual'}</h3>
                  </div>
                  <Link href={`/jobs/${id}/results`} className="text-[11px] text-[#60A5FA] hover:underline">
                    {lang === 'es' ? 'Ver detalle' : 'View detail'}
                  </Link>
                </div>
                {totalBudget > 0 || totalActual > 0 ? (
                  <>
                    {canSeeProfit && (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2D35]">
                          <span className="text-xs text-[#6B7280]">{lang === 'es' ? 'Valor del contrato' : 'Contract value'}</span>
                          <span className="text-sm font-bold text-white tabular-nums">{formatMoney(effectiveContractTotal)}</span>
                        </div>
                        <BudgetBar label={lang === 'es' ? 'Materiales registrados' : 'Materials logged'} budgeted={budgetMat} actual={actualMat} />
                        <BudgetBar label={lang === 'es' ? 'Mano de obra registrada' : 'Labor logged'} budgeted={budgetLabor} actual={actualLabor} />
                        {(budgetOther > 0 || actualOther > 0) && (
                          <BudgetBar label={lang === 'es' ? 'Otros gastos' : 'Other expenses'} budgeted={budgetOther} actual={actualOther} />
                        )}
                        <div className="flex justify-between items-center py-2 border-t border-[#2A2D35]">
                          <span className="text-xs text-[#6B7280]">{lang === 'es' ? 'Costos totales' : 'Total costs'}</span>
                          <span className="text-sm font-bold text-white tabular-nums">{formatMoney(totalActual)}</span>
                        </div>
                        {(() => {
                          const thHigh = Number(profile?.margin_threshold_high) || 40
                          const thLow = Number(profile?.margin_threshold_low) || 25
                          const marginColor = liveProfitPct >= thHigh ? 'text-[#A8FF3E]' : liveProfitPct >= thLow ? 'text-amber-400' : 'text-red-400'
                          return (
                            <div className="pt-3 space-y-1">
                              {liveProfit < 0 && totalActual > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                                  <TrendingDown className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                                  <span className="text-[11px] font-bold text-red-400">
                                    {lang === 'es' ? 'PÉRDIDA — gastos superan el precio del contrato' : 'LOSS — expenses exceed contract price'}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-baseline">
                                <span className="text-xs text-[#6B7280]">{lang === 'es' ? 'Margen real' : 'Real margin'}</span>
                                <div className={`flex items-center gap-1 text-lg font-bold tabular-nums ${marginColor}`}>
                                  <TrendingUp className="h-4 w-4" />
                                  {liveProfitPct.toFixed(1)}%
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-[#6B7280]">{lang === 'es' ? 'Proyectado (estimado)' : 'Projected (estimate)'}</span>
                                <span className="text-xs text-[#6B7280] tabular-nums">
                                  {((totalBudget > 0 ? (effectiveContractTotal - totalBudget) / effectiveContractTotal : 0) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                      </>
                    )}
                    {!canSeeProfit && (
                      <>
                        <BudgetBar label={lang === 'es' ? 'Materiales' : 'Materials'} budgeted={budgetMat} actual={actualMat} />
                        <BudgetBar label={lang === 'es' ? 'Mano de obra' : 'Labor'} budgeted={budgetLabor} actual={actualLabor} />
                        {(budgetOther > 0 || actualOther > 0) && (
                          <BudgetBar label={lang === 'es' ? 'Otros gastos' : 'Other expenses'} budgeted={budgetOther} actual={actualOther} />
                        )}
                      </>
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

            {/* ── SECCIÓN: SEGUIMIENTO DEL TRABAJO ── */}
            <div className="flex items-center gap-2.5 pt-3">
              <div className="w-[3px] h-[14px] rounded-full bg-[#A78BFA]" />
              <span className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-[0.14em]">
                {lang === 'es' ? 'Seguimiento del Trabajo' : 'Job Tracking'}
              </span>
            </div>

            {/* Tracking action cards */}
            <div className="space-y-2">
              {[
                { href: `/jobs/${id}/tracking`, icon: CalendarDays, title_es: 'Cronograma', title_en: 'Tracking', desc_es: 'Fechas y etapas de la obra', desc_en: 'Milestones and stage dates', color: '#A78BFA' },
                { href: `/jobs/${id}/timetrack`, icon: Clock, title_es: 'Horas y Gastos', title_en: 'Time & Expenses', desc_es: 'Registrar horas del crew y gastos', desc_en: 'Log crew hours and expenses', color: '#A78BFA' },
                { href: `/jobs/${id}/log`, icon: BookOpen, title_es: 'Field Log', title_en: 'Field Log', desc_es: 'Bitácora de obra y notas de campo', desc_en: 'Field notes and project log', color: '#A78BFA' },
                { href: `/jobs/${id}/results`, icon: BarChart3, title_es: 'Resultados', title_en: 'Results', desc_es: 'Ver análisis final del trabajo', desc_en: 'View final job analysis', color: '#A78BFA' },
              ].map((s) => (
                <Link key={s.href} href={s.href}>
                  <div className="bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-4 flex items-center gap-4 hover:bg-[#252830] transition-all cursor-pointer">
                    <s.icon className="h-7 w-7 flex-shrink-0" style={{ color: s.color }} />
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
              { href: `/jobs/${id}/log`, icon: BookOpen, title_es: 'Field Log', title_en: 'Field Log', desc_es: 'Bitácora de obra', desc_en: 'Field notes' },
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
                  <button onClick={handleCopyLink} className="h-10 px-3 rounded-[8px] border border-[#2A2D35] bg-transparent text-[#6B7280] hover:bg-[#252830]" aria-label={lang === 'es' ? 'Copiar enlace' : 'Copy link'}><Copy className="h-3.5 w-3.5" /></button>
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

      {/* Change Order modal */}
      {showChangeOrderModal && job && (
        <ChangeOrderModal
          job={{ id: job.id, client_name: job.client_name, client_phone: job.client_phone || '', client_email: job.client_email || '', client_address: job.client_address || '' }}
          originalTotal={originalTotal}
          companyName={profile?.company_name || ''}
          lang={lang}
          onClose={() => setShowChangeOrderModal(false)}
          onSaved={(co) => { setChangeOrders((prev) => [co, ...prev]); setShowChangeOrderModal(false) }}
        />
      )}

      <AppHeader />
      <MobileNav />
    </div>
  )
}
