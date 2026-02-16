'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Plus, Trash2, Download, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TEMPLATES, scaleTemplateItems } from '@/lib/templates'
import type { Job, EstimateItem, JobType } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

interface LocalItem {
  id?: string
  category: 'material' | 'labor' | 'other'
  name: string
  quantity: number
  unit: string
  unit_price: number
  sort_order: number
}

export default function EstimatePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t, lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [items, setItems] = useState<LocalItem[]>([])
  const [overheadPct, setOverheadPct] = useState(15)
  const [marginPct, setMarginPct] = useState(20)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', id).single()
      if (!jobData) return
      setJob(jobData as Job)
      setOverheadPct(Number(jobData.overhead_pct) || 15)
      setMarginPct(Number(jobData.margin_pct) || 20)

      const { data: existingItems } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('job_id', id)
        .order('sort_order')

      if (existingItems && existingItems.length > 0) {
        setItems(
          existingItems.map((ei: EstimateItem) => ({
            id: ei.id,
            category: ei.category,
            name: ei.name,
            quantity: Number(ei.quantity),
            unit: ei.unit,
            unit_price: Number(ei.unit_price),
            sort_order: ei.sort_order,
          }))
        )
      } else {
        loadTemplate(jobData.job_type as JobType, Number(jobData.square_footage) || 1000)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function loadTemplate(jobType: JobType, sqft: number) {
    const template = JOB_TEMPLATES[jobType]
    if (!template) return
    const scaled = scaleTemplateItems(template.items, sqft)
    setItems(
      scaled.map((ti, idx) => ({
        category: ti.category,
        name: ti.name,
        quantity: ti.quantity,
        unit: ti.unit,
        unit_price: ti.unit_price,
        sort_order: idx,
      }))
    )
  }

  const updateItem = useCallback((index: number, field: string, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addItem = useCallback((category: 'material' | 'labor' | 'other') => {
    setItems((prev) => [
      ...prev,
      { category, name: '', quantity: 1, unit: category === 'labor' ? 'horas' : 'each', unit_price: 0, sort_order: prev.length },
    ])
  }, [])

  const calc = useMemo(() => {
    const materials = items.filter((i) => i.category === 'material').reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const labor = items.filter((i) => i.category === 'labor').reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const other = items.filter((i) => i.category === 'other').reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const subtotal = materials + labor + other
    const overhead = subtotal * (overheadPct / 100)
    const beforeMargin = subtotal + overhead
    const margin = beforeMargin * (marginPct / 100)
    const total = beforeMargin + margin
    return { materials, labor, other, subtotal, overhead, margin, total }
  }, [items, overheadPct, marginPct])

  async function handleSave() {
    setSaving(true)
    try {
      // Delete existing items
      await supabase.from('estimate_items').delete().eq('job_id', id)

      // Insert new items
      if (items.length > 0) {
        const rows = items.map((item, idx) => ({
          job_id: id,
          category: item.category,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          sort_order: idx,
        }))
        const { error } = await supabase.from('estimate_items').insert(rows)
        if (error) throw error
      }

      // Update job totals
      await supabase.from('jobs').update({
        estimated_total: calc.total,
        overhead_pct: overheadPct,
        margin_pct: marginPct,
        updated_at: new Date().toISOString(),
      }).eq('id', id)

      toast.success(lang === 'es' ? '¡Presupuesto guardado!' : 'Estimate saved!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleAccepted() {
    await handleSave()
    await supabase.from('jobs').update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    toast.success(lang === 'es' ? '¡Arrancamos! Trabajo aceptado.' : 'Let\'s go! Job accepted.')
    router.push(`/jobs/${id}`)
  }

  function handleGeneratePdf() {
    const w = window.open('', '_blank')
    if (!w) return
    const materialRows = items.filter(i => i.category === 'material')
    const laborRows = items.filter(i => i.category === 'labor')
    const otherRows = items.filter(i => i.category === 'other')

    const renderRows = (rows: LocalItem[]) => rows.map(i =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${i.name}</td>
       <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${i.quantity} ${i.unit}</td>
       <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(i.unit_price)}</td>
       <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${formatMoney(i.quantity * i.unit_price)}</td></tr>`
    ).join('')

    w.document.write(`<!DOCTYPE html><html><head><title>Presupuesto - ${job?.client_name}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#333}
    table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#f3f4f6;padding:8px;text-align:left;font-size:13px}
    .header{display:flex;justify-content:space-between;align-items:start;margin-bottom:24px}
    .total-row{font-size:18px;font-weight:700;background:#ecfdf5;padding:12px;text-align:right;border-radius:8px}
    @media print{body{padding:0}}</style></head><body>
    <div class="header"><div><h1 style="color:#10b981;margin:0">RoofBack</h1>
    <p style="color:#666;margin:4px 0">${lang === 'es' ? 'Presupuesto de trabajo' : 'Job Estimate'}</p></div>
    <div style="text-align:right"><p style="margin:0;font-weight:600">${job?.client_name || ''}</p>
    <p style="margin:2px 0;color:#666;font-size:14px">${job?.client_address || ''}</p>
    <p style="margin:2px 0;color:#666;font-size:14px">${job?.client_phone || ''}</p>
    <p style="margin:2px 0;color:#999;font-size:12px">${new Date().toLocaleDateString()}</p></div></div>
    <h3>Materiales</h3><table><thead><tr><th>Item</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Precio/u</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${renderRows(materialRows)}</tbody></table>
    <h3>Mano de obra</h3><table><thead><tr><th>Item</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Precio/u</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${renderRows(laborRows)}</tbody></table>
    ${otherRows.length > 0 ? `<h3>Otros</h3><table><thead><tr><th>Item</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Precio/u</th><th style="text-align:right">Total</th></tr></thead><tbody>${renderRows(otherRows)}</tbody></table>` : ''}
    <table><tbody>
    <tr><td style="padding:4px 8px;text-align:right">Subtotal:</td><td style="padding:4px 8px;text-align:right;width:120px">${formatMoney(calc.subtotal)}</td></tr>
    <tr><td style="padding:4px 8px;text-align:right">Overhead (${overheadPct}%):</td><td style="padding:4px 8px;text-align:right">${formatMoney(calc.overhead)}</td></tr>
    <tr><td style="padding:4px 8px;text-align:right">Margen (${marginPct}%):</td><td style="padding:4px 8px;text-align:right">${formatMoney(calc.margin)}</td></tr>
    </tbody></table>
    <div class="total-row">TOTAL: ${formatMoney(calc.total)}</div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:32px">Generado con RoofBack — roofback.app</p>
    <script>setTimeout(()=>window.print(),500)</script></body></html>`)
    w.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  const renderSection = (category: 'material' | 'labor' | 'other', title: string) => {
    const sectionItems = items
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .filter((i) => i.category === category)

    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
          <div className="space-y-3">
            {sectionItems.map((item) => (
              <div key={item.originalIndex} className="flex items-start gap-2 pb-3 border-b border-gray-100 last:border-0">
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.originalIndex, 'name', e.target.value)}
                    placeholder={lang === 'es' ? 'Nombre del item' : 'Item name'}
                    className="h-10 text-sm font-medium"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-gray-400">{t('estimate.qty')}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.originalIndex, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">{t('estimate.unit')}</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(item.originalIndex, 'unit', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">$/u</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.originalIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-right text-sm font-semibold text-gray-700">
                    = {formatMoney(item.quantity * item.unit_price)}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.originalIndex)}
                  className="p-2 text-red-400 hover:text-red-600 mt-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-emerald-600 hover:text-emerald-700"
            onClick={() => addItem(category)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('estimate.addItem')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b px-4 pt-12 pb-4">
        <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-gray-500 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {job?.client_name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('estimate.title')}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {renderSection('material', t('estimate.materials'))}
        {renderSection('labor', t('estimate.labor'))}
        {renderSection('other', t('estimate.other'))}

        {/* Totals */}
        <Card className="border-0 shadow-md border-l-4 border-l-emerald-500">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400">{t('estimate.overheadPct')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={overheadPct}
                  onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">{t('estimate.marginPct')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={marginPct}
                  onChange={(e) => setMarginPct(parseFloat(e.target.value) || 0)}
                  className="h-10"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('estimate.subtotalMaterials')}</span>
                <span>{formatMoney(calc.materials)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('estimate.subtotalLabor')}</span>
                <span>{formatMoney(calc.labor)}</span>
              </div>
              {calc.other > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('estimate.subtotalOther')}</span>
                  <span>{formatMoney(calc.other)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{t('estimate.overhead')} ({overheadPct}%)</span>
                <span>{formatMoney(calc.overhead)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('estimate.margin')} ({marginPct}%)</span>
                <span>{formatMoney(calc.margin)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-emerald-700 pt-1">
                <span>{t('estimate.grandTotal')}</span>
                <span>{formatMoney(calc.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saving ? t('estimate.saving') : t('estimate.save')}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleGeneratePdf} className="h-12">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleAccepted}
              className="h-12 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {lang === 'es' ? 'Aceptado' : 'Accepted'}
            </Button>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
