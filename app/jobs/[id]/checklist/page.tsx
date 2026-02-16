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
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Job, MaterialChecklist, EstimateItem } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

interface LocalChecklist {
  id?: string
  estimate_item_id: string | null
  name: string
  quantity_needed: number
  unit: string
  is_checked: boolean
  actual_cost: number | null
}

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [items, setItems] = useState<LocalChecklist[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', id).single()
      setJob(jobData as Job)

      const { data: existing } = await supabase
        .from('material_checklist')
        .select('*')
        .eq('job_id', id)
        .order('created_at')

      if (existing && existing.length > 0) {
        setItems(
          existing.map((c: MaterialChecklist) => ({
            id: c.id,
            estimate_item_id: c.estimate_item_id,
            name: c.name,
            quantity_needed: Number(c.quantity_needed),
            unit: c.unit,
            is_checked: c.is_checked,
            actual_cost: c.actual_cost !== null ? Number(c.actual_cost) : null,
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [id, supabase])

  async function generateFromEstimate() {
    const { data: estimateItems } = await supabase
      .from('estimate_items')
      .select('*')
      .eq('job_id', id)
      .eq('category', 'material')
      .order('sort_order')

    if (!estimateItems || estimateItems.length === 0) {
      toast.error(lang === 'es' ? 'No hay materiales en el presupuesto' : 'No materials in estimate')
      return
    }

    setItems(
      estimateItems.map((ei: EstimateItem) => ({
        estimate_item_id: ei.id,
        name: ei.name,
        quantity_needed: Number(ei.quantity),
        unit: ei.unit,
        is_checked: false,
        actual_cost: null,
      }))
    )
    toast.success(lang === 'es' ? 'Checklist generada del presupuesto' : 'Checklist generated from estimate')
  }

  function toggleCheck(index: number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, is_checked: !item.is_checked } : item)))
  }

  function updateActualCost(index: number, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, actual_cost: value ? parseFloat(value) : null } : item))
    )
  }

  const allChecked = items.length > 0 && items.every((i) => i.is_checked)
  const checkedCount = items.filter((i) => i.is_checked).length

  const totals = useMemo(() => {
    const estimated = items.reduce((s, i) => s + i.quantity_needed * 0, 0) // we don't have unit prices in checklist
    const actual = items.reduce((s, i) => s + (i.actual_cost || 0), 0)
    return { estimated, actual }
  }, [items])

  async function handleSave() {
    setSaving(true)
    try {
      await supabase.from('material_checklist').delete().eq('job_id', id)

      if (items.length > 0) {
        const rows = items.map((item) => ({
          job_id: id,
          estimate_item_id: item.estimate_item_id,
          name: item.name,
          quantity_needed: item.quantity_needed,
          unit: item.unit,
          is_checked: item.is_checked,
          actual_cost: item.actual_cost,
        }))
        const { error } = await supabase.from('material_checklist').insert(rows)
        if (error) throw error
      }

      toast.success(lang === 'es' ? '¡Checklist guardada!' : 'Checklist saved!')
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
        <h1 className="text-2xl font-bold text-gray-900">{t('checklist.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('checklist.subtitle')}</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status bar */}
        {items.length > 0 && (
          <Card className={`border-0 shadow-md ${allChecked ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-400'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              {allChecked ? (
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-500" />
              )}
              <div>
                <p className="font-semibold text-sm">
                  {allChecked ? t('checklist.allReady') : t('checklist.notReady')}
                </p>
                <p className="text-xs text-gray-500">
                  {checkedCount}/{items.length} items
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate from estimate */}
        {items.length === 0 && (
          <Button onClick={generateFromEstimate} variant="outline" className="w-full h-12">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('checklist.generate')}
          </Button>
        )}

        {/* Checklist items */}
        {items.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 ${item.is_checked ? 'opacity-60' : ''}`}
                >
                  <Checkbox
                    checked={item.is_checked}
                    onCheckedChange={() => toggleCheck(idx)}
                    className="mt-1 h-6 w-6 data-[state=checked]:bg-emerald-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${item.is_checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.quantity_needed} {item.unit}
                    </p>
                    <div className="mt-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t('checklist.actualCost')}
                        value={item.actual_cost ?? ''}
                        onChange={(e) => updateActualCost(idx, e.target.value)}
                        className="h-9 text-sm w-32"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Totals */}
              {totals.actual > 0 && (
                <>
                  <div className="pt-2 space-y-1 text-sm">
                    <div className="flex justify-between font-semibold">
                      <span>{t('checklist.totalActual')}</span>
                      <span>{formatMoney(totals.actual)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {items.length > 0 && (
          <div className="space-y-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('checklist.save')}
            </Button>
            <Button onClick={generateFromEstimate} variant="outline" className="w-full h-12">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('checklist.generate')}
            </Button>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  )
}
