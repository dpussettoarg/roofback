'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Plus, Trash2, Loader2, Clock, Receipt,
  Camera, ClipboardList, ChevronDown, ChevronUp,
  AlertTriangle, Package, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import type { Job, TimeEntry, Expense, ActivityLog } from '@/lib/types'
import { format } from 'date-fns'
import Image from 'next/image'
import { ImageUploader } from '@/components/app/image-uploader'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

interface LocalTimeEntry {
  id?: string
  worker_name: string
  date: string
  hours: number
  hourly_rate: number
}

interface LocalExpense {
  id?: string
  description: string
  amount: number
  date: string
}

const LOG_TYPE_OPTIONS = [
  { value: 'progress', label_es: 'Avance', label_en: 'Progress', icon: ClipboardList, color: 'text-[#A8FF3E] bg-[#A8FF3E]/10' },
  { value: 'issue', label_es: 'Problema', label_en: 'Issue', icon: AlertTriangle, color: 'text-amber-400 bg-amber-400/10' },
  { value: 'delivery', label_es: 'Entrega de material', label_en: 'Material Delivery', icon: Package, color: 'text-purple-400 bg-purple-400/10' },
  { value: 'completion', label_es: 'Hito completado', label_en: 'Milestone', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-400/10' },
] as const

export default function TimeTrackPage() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [entries, setEntries] = useState<LocalTimeEntry[]>([])
  const [expenses, setExpenses] = useState<LocalExpense[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Activity log state
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityDesc, setActivityDesc] = useState('')
  const [activityType, setActivityType] = useState<'progress' | 'issue' | 'delivery' | 'completion'>('progress')
  const [activityPhotos, setActivityPhotos] = useState<string[]>([])
  const [savingActivity, setSavingActivity] = useState(false)
  const [showTimeSection, setShowTimeSection] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', id).single()
      setJob(jobData as Job)

      const { data: te } = await supabase
        .from('time_entries')
        .select('*')
        .eq('job_id', id)
        .order('date', { ascending: false })

      if (te && te.length > 0) {
        setEntries(
          te.map((e: TimeEntry) => ({
            id: e.id,
            worker_name: e.worker_name,
            date: e.date,
            hours: Number(e.hours),
            hourly_rate: Number(e.hourly_rate),
          }))
        )
      }

      const { data: ex } = await supabase
        .from('expenses')
        .select('*')
        .eq('job_id', id)
        .order('date', { ascending: false })

      if (ex && ex.length > 0) {
        setExpenses(
          ex.map((e: Expense) => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount),
            date: e.date,
          }))
        )
      }

      const { data: acts } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('job_id', id)
        .order('created_at', { ascending: false })

      if (acts && acts.length > 0) {
        setActivities(acts as ActivityLog[])
      }
      setLoading(false)
    }
    load()
  }, [id, supabase])

  function addEntry() {
    setEntries((prev) => [
      { worker_name: '', date: today, hours: 8, hourly_rate: 35 },
      ...prev,
    ])
  }

  function updateEntry(index: number, field: string, value: string | number) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)))
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  function addExpense() {
    setExpenses((prev) => [
      { description: '', amount: 0, date: today },
      ...prev,
    ])
  }

  function updateExpense(index: number, field: string, value: string | number) {
    setExpenses((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)))
  }

  function removeExpense(index: number) {
    setExpenses((prev) => prev.filter((_, i) => i !== index))
  }

  const totalLabor = useMemo(
    () => entries.reduce((s, e) => s + e.hours * e.hourly_rate, 0),
    [entries]
  )
  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  )

  async function handleSaveActivity() {
    if (!activityDesc.trim()) {
      toast.error(lang === 'es' ? 'Escribí una descripción' : 'Write a description')
      return
    }
    setSavingActivity(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No auth')

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          job_id: id,
          user_id: user.id,
          description: activityDesc.trim(),
          photos: activityPhotos,
          log_type: activityType,
        })
        .select()
        .single()

      if (error) throw error

      setActivities(prev => [data as ActivityLog, ...prev])
      setActivityDesc('')
      setActivityPhotos([])
      setActivityType('progress')
      setShowActivityForm(false)
      toast.success(lang === 'es' ? 'Actividad registrada' : 'Activity logged')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSavingActivity(false)
    }
  }

  async function handleDeleteActivity(actId: string) {
    const { error } = await supabase.from('activity_logs').delete().eq('id', actId)
    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== actId))
      toast.success(lang === 'es' ? 'Eliminado' : 'Deleted')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Save time entries
      await supabase.from('time_entries').delete().eq('job_id', id)
      if (entries.length > 0) {
        const rows = entries.map((e) => ({
          job_id: id,
          worker_name: e.worker_name,
          date: e.date,
          hours: e.hours,
          hourly_rate: e.hourly_rate,
          total_cost: e.hours * e.hourly_rate,
        }))
        const { error } = await supabase.from('time_entries').insert(rows)
        if (error) throw error
      }

      // Save expenses
      await supabase.from('expenses').delete().eq('job_id', id)
      if (expenses.length > 0) {
        const rows = expenses.map((e) => ({
          job_id: id,
          description: e.description,
          amount: e.amount,
          date: e.date,
        }))
        const { error } = await supabase.from('expenses').insert(rows)
        if (error) throw error
      }

      // Update job status if not already in progress
      if (job?.status === 'approved') {
        await supabase.from('jobs').update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        }).eq('id', id)
      }

      toast.success(lang === 'es' ? '¡Registro guardado!' : 'Log saved!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2A2D35] border-t-[#A8FF3E]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      <div className="mx-auto max-w-[430px]">
        {/* Header */}
        <div className="bg-[#1E2228] border-b border-[#2A2D35] px-5 pt-12 pb-4">
          <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-[#6B7280] mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {job?.client_name}
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('timetrack.title')}</h1>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* ===== LOG ACTIVITY BUTTON ===== */}
          <button
            onClick={() => setShowActivityForm(!showActivityForm)}
            className="w-full h-14 rounded-2xl btn-lime flex items-center justify-center gap-2 text-base font-medium"
          >
            <Camera className="h-5 w-5" />
            {lang === 'es' ? 'Registrar avance' : 'Log Activity'}
          </button>

          {/* ===== ACTIVITY LOG FORM ===== */}
          {showActivityForm && (
            <Card className="border border-[#2A2D35] shadow-none bg-[#1E2228] rounded-2xl border-l-4 border-l-[#A8FF3E]">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#A8FF3E]" />
                  {lang === 'es' ? 'Nueva entrada de bitácora' : 'New log entry'}
                </h3>

                {/* Log Type */}
                <div className="flex gap-2 flex-wrap">
                  {LOG_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setActivityType(opt.value as typeof activityType)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activityType === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-offset-[#1E2228] ring-current' : 'bg-[#16191F] text-[#6B7280]'}`}
                    >
                      <opt.icon className="h-3.5 w-3.5" />
                      {lang === 'es' ? opt.label_es : opt.label_en}
                    </button>
                  ))}
                </div>

                {/* Description */}
                <textarea
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  placeholder={lang === 'es' ? 'Ej: Terminamos el sector norte, falta el lado sur...' : 'E.g.: Finished north section, south side remaining...'}
                  className="w-full min-h-[80px] p-3 text-sm bg-[#16191F] border border-[#2A2D35] rounded-xl resize-none text-white placeholder-[#6B7280] focus:ring-2 focus:ring-[#A8FF3E]/30 focus:border-[#A8FF3E] outline-none"
                />

                {/* Photos */}
                {/* Photo uploader — camera mode opens native OS bottom sheet */}
                <ImageUploader
                  urls={activityPhotos}
                  onChange={setActivityPhotos}
                  storagePath={`${id}/activity`}
                  bucketName="job-photos"
                  maxPhotos={5}
                  cameraMode
                  lang={lang}
                />

                <div className="flex gap-2 pt-1">
                  <button
                    className="flex-1 h-10 rounded-xl border border-[#2A2D35] bg-transparent text-[#6B7280] hover:text-white hover:border-[#6B7280] transition-colors text-sm font-medium"
                    onClick={() => { setShowActivityForm(false); setActivityDesc(''); setActivityPhotos([]) }}
                  >
                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveActivity}
                    disabled={savingActivity || !activityDesc.trim()}
                    className="flex-1 h-10 rounded-xl btn-lime flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                  >
                    {savingActivity ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {lang === 'es' ? 'Guardar' : 'Save'}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== ACTIVITY TIMELINE ===== */}
          {activities.length > 0 && (
            <Card className="border border-[#2A2D35] shadow-none bg-[#1E2228] rounded-2xl">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <ClipboardList className="h-4 w-4 text-[#A8FF3E]" />
                  {lang === 'es' ? 'Bitácora' : 'Activity Log'}
                  <span className="text-xs font-normal text-[#6B7280] ml-auto">{activities.length} {lang === 'es' ? 'entradas' : 'entries'}</span>
                </h3>

                <div className="space-y-3">
                  {activities.map((act) => {
                    const logOpt = LOG_TYPE_OPTIONS.find(o => o.value === act.log_type) || LOG_TYPE_OPTIONS[0]
                    const LogIcon = logOpt.icon
                    return (
                      <div key={act.id} className="relative pl-8 pb-3 border-b border-[#2A2D35] last:border-0">
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${logOpt.color}`}>
                          <LogIcon className="h-3 w-3" />
                        </div>

                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium text-[#6B7280]">
                                {new Date(act.created_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-[#6B7280]/60">
                                {new Date(act.created_at).toLocaleTimeString(lang === 'es' ? 'es' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-white/80 leading-relaxed">{act.description}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1 text-[#6B7280]/40 hover:text-red-400 transition-colors ml-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Activity photos */}
                        {act.photos && act.photos.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {act.photos.map((url, i) => (
                              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#16191F]">
                                <Image src={url} alt="" fill className="object-cover" sizes="96px" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== TIME ENTRIES (Collapsible) ===== */}
          <Card className="border border-[#2A2D35] shadow-none bg-[#1E2228] rounded-2xl">
            <CardContent className="p-4">
              <button
                onClick={() => setShowTimeSection(!showTimeSection)}
                className="w-full flex items-center justify-between mb-1"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">{t('timetrack.title')}</h3>
                  {entries.length > 0 && <span className="text-xs text-[#6B7280]">({entries.length})</span>}
                </div>
                {showTimeSection ? <ChevronUp className="h-4 w-4 text-[#6B7280]" /> : <ChevronDown className="h-4 w-4 text-[#6B7280]" />}
              </button>

              {showTimeSection && (
                <>
                  <div className="flex justify-end mb-2">
                    <button onClick={addEntry} className="h-8 rounded-lg text-xs px-3 flex items-center gap-1 text-[#A8FF3E] hover:bg-[#A8FF3E]/10 transition-colors">
                      <Plus className="h-3.5 w-3.5" />
                      {lang === 'es' ? 'Agregar' : 'Add'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {entries.map((entry, idx) => (
                      <div key={idx} className="pb-3 border-b border-[#2A2D35] last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <Input
                            value={entry.worker_name}
                            onChange={(e) => updateEntry(idx, 'worker_name', e.target.value)}
                            placeholder={lang === 'es' ? 'Nombre del trabajador' : 'Worker name'}
                            className="input-dark h-9 text-sm font-medium flex-1 mr-2"
                          />
                          <button onClick={() => removeEntry(idx)} className="p-1.5 text-red-400/60 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] text-[#6B7280]">{t('timetrack.date')}</Label>
                            <Input type="date" value={entry.date} onChange={(e) => updateEntry(idx, 'date', e.target.value)} className="input-dark h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-[#6B7280]">{t('timetrack.hours')}</Label>
                            <Input type="number" min="0" step="0.5" value={entry.hours} onChange={(e) => updateEntry(idx, 'hours', parseFloat(e.target.value) || 0)} className="input-dark h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-[#6B7280]">{t('timetrack.rate')}</Label>
                            <Input type="number" min="0" step="0.5" value={entry.hourly_rate} onChange={(e) => updateEntry(idx, 'hourly_rate', parseFloat(e.target.value) || 0)} className="input-dark h-8 text-xs" />
                          </div>
                        </div>
                        <p className="text-right text-sm font-semibold text-[#A8FF3E] mt-1 tabular-nums">= {formatMoney(entry.hours * entry.hourly_rate)}</p>
                      </div>
                    ))}
                    {entries.length === 0 && (
                      <p className="text-center text-[#6B7280] text-xs py-3">
                        {lang === 'es' ? 'Agregá trabajadores para registrar horas' : 'Add workers to log hours'}
                      </p>
                    )}
                  </div>

                  {entries.length > 0 && (
                    <>
                      <Separator className="my-2 bg-[#2A2D35]" />
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-[#6B7280]">{t('timetrack.totalLabor')}</span>
                        <span className="tabular-nums text-white">{formatMoney(totalLabor)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ===== EXPENSES ===== */}
          <Card className="border border-[#2A2D35] shadow-none bg-[#1E2228] rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">{t('timetrack.expenses')}</h3>
                  {expenses.length > 0 && <span className="text-xs text-[#6B7280]">({expenses.length})</span>}
                </div>
                <button onClick={addExpense} className="h-8 rounded-lg text-xs px-3 flex items-center gap-1 text-[#A8FF3E] hover:bg-[#A8FF3E]/10 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  {lang === 'es' ? 'Agregar' : 'Add'}
                </button>
              </div>

              <div className="space-y-3">
                {expenses.map((exp, idx) => (
                  <div key={idx} className="flex items-start gap-2 pb-3 border-b border-[#2A2D35] last:border-0">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={exp.description}
                        onChange={(e) => updateExpense(idx, 'description', e.target.value)}
                        placeholder={lang === 'es' ? 'Ej: Dump fee, gasolina...' : 'E.g.: Dump fee, gas...'}
                        className="input-dark h-9 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={exp.date} onChange={(e) => updateExpense(idx, 'date', e.target.value)} className="input-dark h-8 text-xs" />
                        <Input type="number" min="0" step="0.01" value={exp.amount} onChange={(e) => updateExpense(idx, 'amount', parseFloat(e.target.value) || 0)} placeholder="$" className="input-dark h-8 text-xs" />
                      </div>
                    </div>
                    <button onClick={() => removeExpense(idx)} className="p-1.5 text-red-400/60 hover:text-red-400 mt-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {expenses.length === 0 && (
                  <p className="text-center text-[#6B7280] text-xs py-3">
                    {lang === 'es' ? 'Sin gastos extras todavía' : 'No extra expenses yet'}
                  </p>
                )}
              </div>

              {expenses.length > 0 && (
                <>
                  <Separator className="my-2 bg-[#2A2D35]" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-[#6B7280]">{t('timetrack.totalExpenses')}</span>
                    <span className="tabular-nums text-white">{formatMoney(totalExpenses)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-base font-medium rounded-2xl btn-lime flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('timetrack.save')}
          </button>
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
