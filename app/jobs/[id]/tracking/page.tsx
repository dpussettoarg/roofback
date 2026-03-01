'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import {
  ArrowLeft, ClipboardList, HardDriveDownload, Wrench, Flag,
  ChevronDown, ChevronUp, MessageCircle, CheckCircle, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Job } from '@/lib/types'

const STAGES = [
  { key: 'contract',   wfKey: 'approved',          icon: ClipboardList,     label_es: 'Contrato',   label_en: 'Contract'  },
  { key: 'materials',  wfKey: 'materials_ordered',  icon: HardDriveDownload, label_es: 'Materiales', label_en: 'Materials' },
  { key: 'jobsite',    wfKey: 'in_progress',        icon: Wrench,            label_es: 'En Obra',    label_en: 'Job Site'  },
  { key: 'completed',  wfKey: 'completed',          icon: Flag,              label_es: 'Finalizado', label_en: 'Finished'  },
]

type MilestoneData = { scheduled?: string; completed?: string; notes?: string }

function daysBetween(dateA: string | undefined, dateB: string | undefined): string {
  if (!dateA || !dateB) return '?'
  const diff = Math.round((new Date(dateB).getTime() - new Date(dateA).getTime()) / 86400000)
  return diff > 0 ? `${diff}d` : '?'
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function fmtDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>()
  const { lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [milestoneDates, setMilestoneDates] = useState<Record<string, MilestoneData>>({})
  const [savingMilestone, setSavingMilestone] = useState<string | null>(null)
  const [expandedStage, setExpandedStage] = useState<number | null>(null)
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})

  const locale = lang === 'es' ? 'es' : 'en-US'

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single()
      setJob(data as Job)

      const { data: milestones } = await supabase
        .from('job_milestones')
        .select('stage, scheduled_date, completed_date, notes')
        .eq('job_id', id)
      if (milestones) {
        const map: Record<string, MilestoneData> = {}
        const draft: Record<string, string> = {}
        ;(milestones as { stage: string; scheduled_date?: string; completed_date?: string; notes?: string }[]).forEach((m) => {
          map[m.stage] = { scheduled: m.scheduled_date || '', completed: m.completed_date || '', notes: m.notes || '' }
          draft[m.stage] = m.notes || ''
        })
        setMilestoneDates(map)
        setNotesDraft(draft)
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function saveMilestone(
    stage: string,
    field: 'scheduled_date' | 'completed_date' | 'notes',
    value: string,
    orgId: string | null
  ) {
    const key = `${stage}-${field}`
    setSavingMilestone(key)
    try {
      const payload = {
        job_id: id,
        organization_id: orgId,
        stage,
        [field]: value || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('job_milestones')
        .upsert(payload, { onConflict: 'job_id,stage' })
      if (error) throw error

      setMilestoneDates((prev) => {
        const stateField =
          field === 'scheduled_date' ? 'scheduled' : field === 'completed_date' ? 'completed' : 'notes'
        return { ...prev, [stage]: { ...prev[stage], [stateField]: value } }
      })
      toast.success(lang === 'es' ? 'Guardado' : 'Saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSavingMilestone(null)
    }
  }

  function suggestDates() {
    if (!job?.start_date) {
      toast.error(lang === 'es' ? 'El trabajo no tiene fecha de inicio' : 'Job has no start date')
      return
    }
    const sqft = Number(job.square_footage) || 1000
    const jobDays = Math.max(3, Math.min(21, Math.round(sqft / 400)))

    const contractDate = job.start_date
    const materialsDate = addDays(contractDate, 10)
    const jobsiteDate = addDays(materialsDate, 3)
    const completedDate = addDays(jobsiteDate, jobDays)

    const suggested: Record<string, string> = {
      contract: contractDate,
      materials: materialsDate,
      jobsite: jobsiteDate,
      completed: completedDate,
    }

    setMilestoneDates((prev) => {
      const next = { ...prev }
      Object.entries(suggested).forEach(([key, val]) => {
        next[key] = { ...next[key], scheduled: val }
      })
      return next
    })

    toast.success(lang === 'es' ? 'Fechas sugeridas aplicadas — guardá cada una' : 'Suggested dates applied — save each one')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#A8FF3E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <p className="text-[#6B7280]">{lang === 'es' ? 'Trabajo no encontrado' : 'Job not found'}</p>
      </div>
    )
  }

  const currentStage = job.workflow_stage || 'approved'
  const stepIndex =
    currentStage === 'completed' || currentStage === 'invoiced' || currentStage === 'paid' ? 3
    : currentStage === 'in_progress' ? 2
    : currentStage === 'materials_ordered' ? 1
    : 0

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      <div className="mx-auto max-w-[430px]">

        {/* Header */}
        <div className="bg-[#1E2228] border-b border-[#2A2D35] px-5 pt-12 pb-4">
          <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-[#6B7280] mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {job.client_name}
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {lang === 'es' ? 'Cronograma de Obra' : 'Milestone Tracker'}
          </h1>
        </div>

        <div className="px-4 py-5 space-y-4">

          {/* ── Visual Flow ── */}
          <div className="bg-[#1E2228] rounded-[14px] border border-[#2A2D35] p-4">

            {/* Suggest dates button */}
            <button
              onClick={suggestDates}
              className="w-full h-10 rounded-xl border border-[#A8FF3E]/30 text-[#A8FF3E] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#A8FF3E]/5 transition-colors mb-5"
            >
              <Sparkles className="h-4 w-4" />
              {lang === 'es' ? 'Sugerir fechas automáticas' : 'Suggest dates'}
            </button>

            {/* Flow nodes + connectors */}
            <div className="flex items-start">
              {STAGES.map((s, i) => {
                const done = i < stepIndex
                const active = i === stepIndex
                const md = milestoneDates[s.key] || {}
                const Icon = s.icon
                const between = i < STAGES.length - 1
                  ? daysBetween(milestoneDates[STAGES[i].key]?.scheduled, milestoneDates[STAGES[i + 1].key]?.scheduled)
                  : null

                return (
                  <div key={s.key} className="flex flex-1 items-start min-w-0">
                    {/* Stage node */}
                    <button
                      onClick={() => setExpandedStage(expandedStage === i ? null : i)}
                      className="flex flex-col items-center flex-shrink-0 min-w-0 gap-1"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                        active  ? 'bg-[#A8FF3E] text-[#0F1117] ring-2 ring-[#A8FF3E]/40'
                        : done  ? 'bg-[#A8FF3E]/20 text-[#A8FF3E]'
                        :         'bg-[#0F1117] text-[#4B5563] border border-[#2A2D35]'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[9px] font-semibold text-center leading-tight max-w-[52px] break-words ${
                        active ? 'text-[#A8FF3E]' : done ? 'text-[#9CA3AF]' : 'text-[#4B5563]'
                      }`}>
                        {lang === 'es' ? s.label_es : s.label_en}
                      </span>
                      {md.scheduled && (
                        <span className="text-[9px] text-[#6B7280] text-center">
                          {fmtDate(md.scheduled, locale)}
                        </span>
                      )}
                      {md.completed ? (
                        <span className="text-[9px] text-[#A8FF3E] text-center">
                          ✓ {fmtDate(md.completed, locale)}
                        </span>
                      ) : md.scheduled && i < stepIndex ? (
                        <span className="text-[9px] text-red-400 text-center">
                          {lang === 'es' ? 'Atrasado' : 'Overdue'}
                        </span>
                      ) : null}
                    </button>

                    {/* Connector with days label */}
                    {i < STAGES.length - 1 && (
                      <div className="flex-1 flex flex-col items-center pt-4 px-1 min-w-0">
                        <div className={`w-full h-0.5 rounded-full ${i < stepIndex ? 'bg-[#A8FF3E]' : 'bg-[#2A2D35]'}`} />
                        <span className={`text-[10px] whitespace-nowrap mt-0.5 ${between === '?' ? 'text-[#3A3D45]' : 'text-[#6B7280]'}`}>
                          {between === '?' ? '─ ? ─' : between}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Detail Rows ── */}
          <div className="bg-[#1E2228] rounded-[14px] border border-[#2A2D35] overflow-hidden">
            {STAGES.map((s, i) => {
              const isActive = i === stepIndex
              const isFinished = i < stepIndex
              const md = milestoneDates[s.key] || {}
              const open = expandedStage === i
              const savingPrefix = `${s.key}-`

              return (
                <div key={s.key} className={`border-b border-[#2A2D35] last:border-b-0 ${isActive ? 'bg-[#A8FF3E]/5' : ''}`}>
                  {/* Row header */}
                  <button
                    onClick={() => setExpandedStage(open ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#252830] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isActive  ? 'bg-[#A8FF3E] text-[#0F1117]'
                        : isFinished ? 'bg-[#A8FF3E]/20 text-[#A8FF3E]'
                        :             'bg-[#0F1117] text-[#4B5563] border border-[#2A2D35]'
                      }`}>
                        <s.icon className="h-3 w-3" />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${isActive ? 'text-[#A8FF3E]' : 'text-white'}`}>
                          {lang === 'es' ? s.label_es : s.label_en}
                        </p>
                        {md.scheduled && (
                          <p className="text-[11px] text-[#6B7280]">
                            {lang === 'es' ? 'Planificado: ' : 'Planned: '}
                            {fmtDate(md.scheduled, locale)}
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
                      {isFinished && md.completed && (
                        <CheckCircle className="h-4 w-4 text-[#A8FF3E]" />
                      )}
                      {open ? <ChevronUp className="h-4 w-4 text-[#6B7280]" /> : <ChevronDown className="h-4 w-4 text-[#6B7280]" />}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {open && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Planned date */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-white">
                          {lang === 'es' ? 'Fecha planificada' : 'Planned date'}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            defaultValue={md.scheduled || ''}
                            onChange={(e) =>
                              setMilestoneDates((prev) => ({
                                ...prev,
                                [s.key]: { ...prev[s.key], scheduled: e.target.value },
                              }))
                            }
                            aria-label={lang === 'es' ? 'Fecha planificada' : 'Planned date'}
                            className="flex-1 min-h-[44px] rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm focus:outline-none focus:border-[#A8FF3E] transition-colors"
                            style={{ colorScheme: 'dark' }}
                          />
                          <button
                            type="button"
                            onClick={() => saveMilestone(s.key, 'scheduled_date', md.scheduled || '', job.organization_id)}
                            disabled={savingMilestone?.startsWith(savingPrefix)}
                            aria-label={lang === 'es' ? 'Guardar fecha planificada' : 'Save planned date'}
                            className="h-11 min-w-[44px] px-3 rounded-lg bg-[#A8FF3E] text-[#0F1117] text-sm font-bold disabled:opacity-50 shrink-0"
                          >
                            {savingMilestone === `${s.key}-scheduled_date` ? '…' : '✓'}
                          </button>
                        </div>
                      </div>

                      {/* Actual completion date */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-white">
                          {lang === 'es' ? 'Fecha real de finalización' : 'Actual completion date'}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            defaultValue={md.completed || ''}
                            onChange={(e) =>
                              setMilestoneDates((prev) => ({
                                ...prev,
                                [s.key]: { ...prev[s.key], completed: e.target.value },
                              }))
                            }
                            aria-label={lang === 'es' ? 'Fecha real' : 'Actual completion date'}
                            className="flex-1 min-h-[44px] rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm focus:outline-none focus:border-[#A8FF3E] transition-colors"
                            style={{ colorScheme: 'dark' }}
                          />
                          <button
                            type="button"
                            onClick={() => saveMilestone(s.key, 'completed_date', md.completed || '', job.organization_id)}
                            disabled={savingMilestone?.startsWith(savingPrefix)}
                            aria-label={lang === 'es' ? 'Guardar fecha real' : 'Save actual date'}
                            className="h-11 min-w-[44px] px-3 rounded-lg border border-[#2A2D35] text-[#6B7280] text-sm font-bold disabled:opacity-50 hover:bg-[#252830] shrink-0"
                          >
                            {savingMilestone === `${s.key}-completed_date` ? '…' : '✓'}
                          </button>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-white">
                          {lang === 'es' ? 'Notas de esta etapa' : 'Stage notes'}
                        </p>
                        <textarea
                          value={notesDraft[s.key] ?? md.notes ?? ''}
                          onChange={(e) => setNotesDraft((prev) => ({ ...prev, [s.key]: e.target.value }))}
                          placeholder={lang === 'es' ? 'Ej: Esperando materiales de proveedor...' : 'E.g.: Waiting on supplier delivery...'}
                          rows={3}
                          className="w-full rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 py-2.5 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E] transition-colors resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => saveMilestone(s.key, 'notes', notesDraft[s.key] ?? md.notes ?? '', job.organization_id)}
                          disabled={savingMilestone === `${s.key}-notes`}
                          className="h-9 px-4 rounded-lg bg-[#252830] border border-[#2A2D35] text-[#9CA3AF] text-xs font-semibold disabled:opacity-50 hover:border-[#A8FF3E]/30 hover:text-white transition-colors"
                        >
                          {savingMilestone === `${s.key}-notes`
                            ? (lang === 'es' ? 'Guardando…' : 'Saving…')
                            : (lang === 'es' ? 'Guardar notas' : 'Save notes')}
                        </button>
                      </div>

                      {/* Notify client */}
                      <button
                        onClick={() => {
                          const dateStr = md.scheduled
                            ? new Date(md.scheduled + 'T12:00').toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
                            : ''
                          const stageLabel = lang === 'es' ? s.label_es : s.label_en
                          const msg = lang === 'es'
                            ? `Hola ${job.client_name}, te informamos que la etapa "${stageLabel}" está programada para el ${dateStr}. ¡Gracias!`
                            : `Hi ${job.client_name}, we're letting you know the "${stageLabel}" milestone is scheduled for ${dateStr}. Thank you!`
                          const phone = job.client_phone?.replace(/\D/g, '') || ''
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

                      {/* Advance stage */}
                      {(() => {
                        const alreadyCurrent = isActive
                        const alreadyPast = isFinished
                        const isNextStage = i === stepIndex + 1
                        const canAdvance = !alreadyCurrent && !alreadyPast && isNextStage
                        return (
                          <button
                            onClick={async () => {
                              if (!canAdvance) return
                              const newStage = s.wfKey as import('@/lib/types').WorkflowStage
                              const { error } = await supabase
                                .from('jobs')
                                .update({ workflow_stage: newStage, updated_at: new Date().toISOString() })
                                .eq('id', id)
                              if (!error) {
                                setJob((j) => j ? { ...j, workflow_stage: newStage } : j)
                                toast.success(lang === 'es' ? '¡Etapa avanzada!' : 'Stage advanced!')
                                setExpandedStage(null)
                              } else {
                                toast.error(error.message)
                              }
                            }}
                            disabled={alreadyCurrent || alreadyPast}
                            className={`w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors
                              ${alreadyCurrent
                                ? 'bg-[#A8FF3E]/10 border border-[#A8FF3E]/30 text-[#A8FF3E] cursor-default opacity-60'
                                : alreadyPast
                                ? 'border border-[#2A2D35] text-[#4B5563] cursor-not-allowed opacity-40'
                                : 'border border-[#A8FF3E]/40 text-[#A8FF3E] hover:bg-[#A8FF3E]/5'
                              }`}
                          >
                            {alreadyCurrent
                              ? (lang === 'es' ? '✓ Etapa actual' : '✓ Current stage')
                              : alreadyPast
                              ? (lang === 'es' ? 'Etapa completada' : 'Stage completed')
                              : (lang === 'es'
                                  ? `Mover proyecto a "${s.label_es}"`
                                  : `Move project to "${s.label_en}"`)}
                          </button>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>
      <MobileNav />
    </div>
  )
}
