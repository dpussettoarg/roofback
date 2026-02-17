'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
  Camera, ClipboardList, Image as ImageIcon, X, ChevronDown, ChevronUp,
  AlertTriangle, Package, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import type { Job, TimeEntry, Expense, ActivityLog } from '@/lib/types'
import { format } from 'date-fns'
import Image from 'next/image'

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
  { value: 'progress', label_es: 'Avance', label_en: 'Progress', icon: ClipboardList, color: 'text-[#008B99] bg-[#008B99]/10' },
  { value: 'issue', label_es: 'Problema', label_en: 'Issue', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  { value: 'delivery', label_es: 'Entrega de material', label_en: 'Material Delivery', icon: Package, color: 'text-purple-600 bg-purple-50' },
  { value: 'completion', label_es: 'Hito completado', label_en: 'Milestone', icon: CheckCircle2, color: 'text-[#78BE20] bg-[#78BE20]/10' },
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
  const [uploadingActivityPhoto, setUploadingActivityPhoto] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)
  const [showTimeSection, setShowTimeSection] = useState(true)
  const activityFileRef = useRef<HTMLInputElement>(null)

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

  async function handleActivityPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingActivityPhoto(true)
    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const path = `${id}/activity_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('job-photos').upload(path, file)
        if (error) throw error
        const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(path)
        newUrls.push(urlData.publicUrl)
      }
      setActivityPhotos(prev => [...prev, ...newUrls])
      toast.success(lang === 'es' ? 'Foto subida' : 'Photo uploaded')
    } catch {
      toast.error(lang === 'es' ? 'Error subiendo foto' : 'Error uploading photo')
    } finally {
      setUploadingActivityPhoto(false)
      if (activityFileRef.current) activityFileRef.current.value = ''
    }
  }

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-slate-400 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {job?.client_name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t('timetrack.title')}</h1>
      </div>

      <div className="px-5 py-5 space-y-4">

        {/* ===== LOG ACTIVITY BUTTON ===== */}
        <button
          onClick={() => setShowActivityForm(!showActivityForm)}
          className="w-full h-14 rounded-2xl btn-gradient flex items-center justify-center gap-2 text-base font-medium"
        >
          <Camera className="h-5 w-5" />
          {lang === 'es' ? 'Registrar avance' : 'Log Activity'}
        </button>

        {/* ===== ACTIVITY LOG FORM ===== */}
        {showActivityForm && (
          <Card className="border-0 shadow-sm bg-white rounded-2xl border-l-4 border-l-[#008B99]">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[#008B99]" />
                {lang === 'es' ? 'Nueva entrada de bitácora' : 'New log entry'}
              </h3>

              {/* Log Type */}
              <div className="flex gap-2 flex-wrap">
                {LOG_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setActivityType(opt.value as typeof activityType)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activityType === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-500'}`}
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
                className="w-full min-h-[80px] p-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-[#008B99]/20 focus:border-[#008B99] outline-none"
              />

              {/* Photos */}
              {activityPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {activityPhotos.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100">
                      <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                      <button
                        onClick={() => setActivityPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input ref={activityFileRef} type="file" accept="image/*" capture="environment" multiple onChange={handleActivityPhotoUpload} className="hidden" />

              <div className="flex gap-2">
                <button
                  onClick={() => activityFileRef.current?.click()}
                  disabled={uploadingActivityPhoto}
                  className="flex-1 h-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-[#008B99] hover:text-[#008B99] transition-colors flex items-center justify-center gap-2"
                >
                  {uploadingActivityPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <span className="text-xs">{uploadingActivityPhoto ? (lang === 'es' ? 'Subiendo...' : 'Uploading...') : (lang === 'es' ? 'Tomar / subir foto' : 'Take / upload photo')}</span>
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl"
                  onClick={() => { setShowActivityForm(false); setActivityDesc(''); setActivityPhotos([]) }}
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <button
                  onClick={handleSaveActivity}
                  disabled={savingActivity || !activityDesc.trim()}
                  className="flex-1 h-10 rounded-xl btn-gradient flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
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
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <ClipboardList className="h-4 w-4 text-[#008B99]" />
                {lang === 'es' ? 'Bitácora' : 'Activity Log'}
                <span className="text-xs font-normal text-slate-400 ml-auto">{activities.length} {lang === 'es' ? 'entradas' : 'entries'}</span>
              </h3>

              <div className="space-y-3">
                {activities.map((act) => {
                  const logOpt = LOG_TYPE_OPTIONS.find(o => o.value === act.log_type) || LOG_TYPE_OPTIONS[0]
                  const LogIcon = logOpt.icon
                  return (
                    <div key={act.id} className="relative pl-8 pb-3 border-b border-slate-50 last:border-0">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${logOpt.color}`}>
                        <LogIcon className="h-3 w-3" />
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-slate-500">
                              {new Date(act.created_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(act.created_at).toLocaleTimeString(lang === 'es' ? 'es' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{act.description}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          className="p-1 text-slate-300 hover:text-red-400 transition-colors ml-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Activity photos */}
                      {act.photos && act.photos.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {act.photos.map((url, i) => (
                            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100">
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
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4">
            <button
              onClick={() => setShowTimeSection(!showTimeSection)}
              className="w-full flex items-center justify-between mb-1"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-slate-700">{t('timetrack.title')}</h3>
                {entries.length > 0 && <span className="text-xs text-slate-400">({entries.length})</span>}
              </div>
              {showTimeSection ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {showTimeSection && (
              <>
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="outline" onClick={addEntry} className="h-8 rounded-lg text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {lang === 'es' ? 'Agregar' : 'Add'}
                  </Button>
                </div>

                <div className="space-y-3">
                  {entries.map((entry, idx) => (
                    <div key={idx} className="pb-3 border-b border-slate-50 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <Input
                          value={entry.worker_name}
                          onChange={(e) => updateEntry(idx, 'worker_name', e.target.value)}
                          placeholder={lang === 'es' ? 'Nombre del trabajador' : 'Worker name'}
                          className="h-9 text-sm font-medium flex-1 mr-2 bg-slate-50/50 border-slate-200 rounded-lg"
                        />
                        <button onClick={() => removeEntry(idx)} className="p-1.5 text-red-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-slate-400">{t('timetrack.date')}</Label>
                          <Input type="date" value={entry.date} onChange={(e) => updateEntry(idx, 'date', e.target.value)} className="h-8 text-xs bg-slate-50/50 border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">{t('timetrack.hours')}</Label>
                          <Input type="number" min="0" step="0.5" value={entry.hours} onChange={(e) => updateEntry(idx, 'hours', parseFloat(e.target.value) || 0)} className="h-8 text-xs bg-slate-50/50 border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">{t('timetrack.rate')}</Label>
                          <Input type="number" min="0" step="0.5" value={entry.hourly_rate} onChange={(e) => updateEntry(idx, 'hourly_rate', parseFloat(e.target.value) || 0)} className="h-8 text-xs bg-slate-50/50 border-slate-200 rounded-lg" />
                        </div>
                      </div>
                      <p className="text-right text-sm font-semibold text-slate-700 mt-1 tabular-nums">= {formatMoney(entry.hours * entry.hourly_rate)}</p>
                    </div>
                  ))}
                  {entries.length === 0 && (
                    <p className="text-center text-slate-400 text-xs py-3">
                      {lang === 'es' ? 'Agregá trabajadores para registrar horas' : 'Add workers to log hours'}
                    </p>
                  )}
                </div>

                {entries.length > 0 && (
                  <>
                    <Separator className="my-2 bg-slate-100" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-slate-500">{t('timetrack.totalLabor')}</span>
                      <span className="tabular-nums">{formatMoney(totalLabor)}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ===== EXPENSES ===== */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-700">{t('timetrack.expenses')}</h3>
                {expenses.length > 0 && <span className="text-xs text-slate-400">({expenses.length})</span>}
              </div>
              <Button size="sm" variant="outline" onClick={addExpense} className="h-8 rounded-lg text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {lang === 'es' ? 'Agregar' : 'Add'}
              </Button>
            </div>

            <div className="space-y-3">
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex items-start gap-2 pb-3 border-b border-slate-50 last:border-0">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={exp.description}
                      onChange={(e) => updateExpense(idx, 'description', e.target.value)}
                      placeholder={lang === 'es' ? 'Ej: Dump fee, gasolina...' : 'E.g.: Dump fee, gas...'}
                      className="h-9 text-sm bg-slate-50/50 border-slate-200 rounded-lg"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={exp.date} onChange={(e) => updateExpense(idx, 'date', e.target.value)} className="h-8 text-xs bg-slate-50/50 border-slate-200 rounded-lg" />
                      <Input type="number" min="0" step="0.01" value={exp.amount} onChange={(e) => updateExpense(idx, 'amount', parseFloat(e.target.value) || 0)} placeholder="$" className="h-8 text-xs bg-slate-50/50 border-slate-200 rounded-lg" />
                    </div>
                  </div>
                  <button onClick={() => removeExpense(idx)} className="p-1.5 text-red-400 hover:text-red-600 mt-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-center text-slate-400 text-xs py-3">
                  {lang === 'es' ? 'Sin gastos extras todavía' : 'No extra expenses yet'}
                </p>
              )}
            </div>

            {expenses.length > 0 && (
              <>
                <Separator className="my-2 bg-slate-100" />
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-500">{t('timetrack.totalExpenses')}</span>
                  <span className="tabular-nums">{formatMoney(totalExpenses)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 text-base font-medium rounded-2xl btn-gradient flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('timetrack.save')}
        </button>
      </div>

      <MobileNav />
    </div>
  )
}
