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
import { ArrowLeft, Plus, Trash2, Loader2, Clock, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import type { Job, TimeEntry, Expense } from '@/lib/types'
import { format } from 'date-fns'

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

export default function TimeTrackPage() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [entries, setEntries] = useState<LocalTimeEntry[]>([])
  const [expenses, setExpenses] = useState<LocalExpense[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

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
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b px-4 pt-12 pb-4">
        <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-gray-500 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {job?.client_name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('timetrack.title')}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Time entries */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-gray-700">{t('timetrack.title')}</h3>
              </div>
              <Button size="sm" variant="outline" onClick={addEntry}>
                <Plus className="h-4 w-4 mr-1" />
                {lang === 'es' ? 'Agregar' : 'Add'}
              </Button>
            </div>

            <div className="space-y-4">
              {entries.map((entry, idx) => (
                <div key={idx} className="pb-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <Input
                      value={entry.worker_name}
                      onChange={(e) => updateEntry(idx, 'worker_name', e.target.value)}
                      placeholder={lang === 'es' ? 'Nombre del trabajador' : 'Worker name'}
                      className="h-10 text-sm font-medium flex-1 mr-2"
                    />
                    <button onClick={() => removeEntry(idx)} className="p-2 text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-gray-400">{t('timetrack.date')}</Label>
                      <Input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(idx, 'date', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">{t('timetrack.hours')}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={entry.hours}
                        onChange={(e) => updateEntry(idx, 'hours', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">{t('timetrack.rate')}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={entry.hourly_rate}
                        onChange={(e) => updateEntry(idx, 'hourly_rate', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-right text-sm font-semibold text-gray-700 mt-1">
                    = {formatMoney(entry.hours * entry.hourly_rate)}
                  </p>
                </div>
              ))}

              {entries.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">
                  {lang === 'es' ? 'Agregá trabajadores para registrar horas' : 'Add workers to log hours'}
                </p>
              )}
            </div>

            {entries.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="flex justify-between text-sm font-semibold">
                  <span>{t('timetrack.totalLabor')}</span>
                  <span>{formatMoney(totalLabor)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-gray-700">{t('timetrack.expenses')}</h3>
              </div>
              <Button size="sm" variant="outline" onClick={addExpense}>
                <Plus className="h-4 w-4 mr-1" />
                {lang === 'es' ? 'Agregar' : 'Add'}
              </Button>
            </div>

            <div className="space-y-3">
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex items-start gap-2 pb-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={exp.description}
                      onChange={(e) => updateExpense(idx, 'description', e.target.value)}
                      placeholder={lang === 'es' ? 'Ej: Dump fee, gasolina, material extra...' : 'E.g.: Dump fee, gas, extra material...'}
                      className="h-10 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={exp.date}
                        onChange={(e) => updateExpense(idx, 'date', e.target.value)}
                        className="h-9 text-sm"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={exp.amount}
                        onChange={(e) => updateExpense(idx, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="$"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <button onClick={() => removeExpense(idx)} className="p-2 text-red-400 hover:text-red-600 mt-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {expenses.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">
                  {lang === 'es' ? 'Sin gastos extras todavía' : 'No extra expenses yet'}
                </p>
              )}
            </div>

            {expenses.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="flex justify-between text-sm font-semibold">
                  <span>{t('timetrack.totalExpenses')}</span>
                  <span>{formatMoney(totalExpenses)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t('timetrack.save')}
        </Button>
      </div>

      <MobileNav />
    </div>
  )
}
