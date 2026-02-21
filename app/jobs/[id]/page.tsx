'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import {
  ArrowLeft, FileText, CheckSquare, Clock, BarChart3, Trash2,
  MapPin, Phone, Send, CheckCircle, Link2, Copy, ChevronRight,
  ShieldCheck, CalendarCheck, Lock, HardHat, CalendarDays,
  MessageSquare, Package, TrendingUp, TrendingDown, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TYPE_OPTIONS, ROOF_TYPE_OPTIONS } from '@/lib/templates'
import { formatJobNumber } from '@/lib/types'
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
  const [clientEmail, setClientEmail] = useState('')
  const [startDate, setStartDate] = useState('')
  const [savingDate, setSavingDate] = useState(false)

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

  function handleNotifyClient() {
    if (!startDate) { toast.error(lang === 'es' ? 'Elegí una fecha primero' : 'Pick a date first'); return }
    const dateStr = new Date(startDate + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const msg = lang === 'es'
      ? `Hola ${job?.client_name}, te confirmo que arrancamos tu techo el ${dateStr}. Cualquier consulta avisá. ¡Gracias!`
      : `Hi ${job?.client_name}, I'm confirming we'll start your roofing job on ${dateStr}. Let me know if you have any questions. Thanks!`
    const encoded = encodeURIComponent(msg)
    const phone = job?.client_phone?.replace(/\D/g, '')
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
    } else {
      const mailBody = encodeURIComponent(msg)
      const subject = encodeURIComponent(lang === 'es' ? 'Fecha de inicio de tu techo' : 'Start date for your roof')
      window.open(`mailto:${job?.client_email}?subject=${subject}&body=${mailBody}`, '_blank')
    }
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
                  {lang === 'es' ? 'Proyecto Activo' : 'Active Project'}
                </span>
              ) : (
                <span className="text-xs font-medium text-[#6B7280]">
                  {lang === 'es' ? 'Lead / Pendiente' : 'Lead / Pending'}
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
            {/* Signed contract card */}
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
                <Link
                  href={`/jobs/${id}/estimate`}
                  className="flex items-center gap-2 text-xs text-[#A8FF3E] hover:underline font-medium"
                >
                  <Lock className="h-3 w-3" />
                  {lang === 'es' ? 'Ver presupuesto aprobado (solo lectura)' : 'View approved estimate (read only)'}
                </Link>
              </div>
            </div>

            {/* Scheduling & Notify */}
            <div className="bg-[#1E2228] rounded-[12px] border border-[#2A2D35] p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-4 w-4 text-[#A8FF3E]" />
                <h3 className="text-sm font-bold text-white">{lang === 'es' ? 'Programación' : 'Scheduling'}</h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 h-11 rounded-lg input-dark text-sm px-3"
                />
                <button
                  onClick={handleSaveStartDate}
                  disabled={savingDate || !startDate}
                  className="h-11 px-4 rounded-lg btn-lime text-sm font-bold disabled:opacity-50"
                >
                  {savingDate ? '...' : lang === 'es' ? 'Guardar' : 'Save'}
                </button>
              </div>
              <button
                onClick={handleNotifyClient}
                disabled={!startDate}
                className="w-full h-11 rounded-lg border border-[#2A2D35] bg-transparent text-sm font-semibold text-white flex items-center justify-center gap-2 hover:bg-[#252830] transition-colors disabled:opacity-40"
              >
                <MessageSquare className="h-4 w-4 text-[#25D366]" />
                {lang === 'es' ? 'Notificar fecha al cliente' : 'Notify client of start date'}
              </button>
            </div>

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

            {/* Budget vs Actual Tracker */}
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
              <div className="flex gap-2">
                <input readOnly value={getProposalUrl() || ''} className="flex-1 h-10 rounded-[8px] bg-[#0F1117] border border-[#2A2D35] px-3 text-xs text-[#6B7280] focus:outline-none" />
                <button onClick={handleCopyLink} className="h-10 px-3 rounded-[8px] border border-[#2A2D35] bg-transparent text-[#6B7280] hover:bg-[#252830]"><Copy className="h-3.5 w-3.5" /></button>
              </div>
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

      <MobileNav />
    </div>
  )
}
