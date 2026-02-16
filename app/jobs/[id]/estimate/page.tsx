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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Plus, Trash2, Download, CheckCircle, Loader2,
  Send, Zap, List, Sparkles
} from 'lucide-react'
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
  const [mode, setMode] = useState<'simple' | 'itemized'>('simple')
  const [items, setItems] = useState<LocalItem[]>([])
  const [overheadPct, setOverheadPct] = useState(15)
  const [marginPct, setMarginPct] = useState(20)
  const [simpleTotal, setSimpleTotal] = useState(0)
  const [simpleDescription, setSimpleDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [clientEmail, setClientEmail] = useState('')

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', id).single()
      if (!jobData) return
      const j = jobData as Job
      setJob(j)
      setMode(j.estimate_mode || 'simple')
      setOverheadPct(Number(j.overhead_pct) || 15)
      setMarginPct(Number(j.margin_pct) || 20)
      setSimpleTotal(Number(j.estimated_total) || 0)
      setSimpleDescription(j.simple_description || '')
      setClientEmail(j.client_email || '')

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
      } else if (j.estimate_mode !== 'simple') {
        loadTemplate(j.job_type as JobType, Number(j.square_footage) || 1000)
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

  const finalTotal = mode === 'simple' ? simpleTotal : calc.total

  async function handleSave() {
    setSaving(true)
    try {
      if (mode === 'itemized') {
        await supabase.from('estimate_items').delete().eq('job_id', id)
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
      }

      await supabase.from('jobs').update({
        estimate_mode: mode,
        estimated_total: finalTotal,
        simple_description: mode === 'simple' ? simpleDescription : '',
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
    toast.success(lang === 'es' ? '¡Arrancamos! Trabajo aceptado.' : "Let's go! Job accepted.")
    router.push(`/jobs/${id}`)
  }

  function handleSendToClient() {
    const proposalUrl = `${window.location.origin}/proposal/${job?.public_token}`
    const subject = encodeURIComponent(
      lang === 'es'
        ? `Presupuesto de ${job?.client_name} - RoofBack`
        : `Estimate for ${job?.client_name} - RoofBack`
    )
    const body = encodeURIComponent(
      lang === 'es'
        ? `Hola ${job?.client_name},\n\nAcá podés ver y aprobar tu presupuesto:\n${proposalUrl}\n\nGracias,\nRoofBack`
        : `Hi ${job?.client_name},\n\nYou can view and approve your estimate here:\n${proposalUrl}\n\nThanks,\nRoofBack`
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

  function handleGeneratePdf() {
    const w = window.open('', '_blank')
    if (!w) return

    if (mode === 'simple') {
      w.document.write(`<!DOCTYPE html><html><head><title>Presupuesto - ${job?.client_name}</title>
      <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#333}
      .total{font-size:32px;font-weight:700;color:#008B99;text-align:center;margin:32px 0;padding:24px;border-radius:16px;background:linear-gradient(135deg,rgba(0,139,153,0.06),rgba(120,190,32,0.06))}
      @media print{body{padding:0}}</style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:32px">
        <div><h1 style="background:linear-gradient(90deg,#008B99,#78BE20);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0">RoofBack</h1></div>
        <div style="text-align:right"><p style="margin:0;font-weight:600">${job?.client_name}</p>
        <p style="margin:2px 0;color:#666;font-size:14px">${job?.client_address || ''}</p>
        <p style="margin:2px 0;color:#999;font-size:12px">${new Date().toLocaleDateString()}</p></div></div>
      <h2>${lang === 'es' ? 'Presupuesto' : 'Estimate'}</h2>
      ${simpleDescription ? `<div style="white-space:pre-wrap;padding:16px;background:#f8fafc;border-radius:8px;margin:16px 0;line-height:1.6">${simpleDescription}</div>` : ''}
      <div class="total">${formatMoney(simpleTotal)}</div>
      <p style="text-align:center;color:#999;font-size:12px;margin-top:32px">Generado con RoofBack</p>
      <script>setTimeout(()=>window.print(),500)</script></body></html>`)
    } else {
      const materialRows = items.filter(i => i.category === 'material')
      const laborRows = items.filter(i => i.category === 'labor')
      const otherRows = items.filter(i => i.category === 'other')
      const renderRows = (rows: LocalItem[]) => rows.map(i =>
        `<tr><td style="padding:8px;border-bottom:1px solid #f1f5f9">${i.name}</td>
         <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:center">${i.quantity} ${i.unit}</td>
         <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${formatMoney(i.quantity * i.unit_price)}</td></tr>`
      ).join('')

      w.document.write(`<!DOCTYPE html><html><head><title>Presupuesto - ${job?.client_name}</title>
      <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#333}
      table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#f8fafc;padding:8px;text-align:left;font-size:13px;color:#64748b}
      .total-row{font-size:24px;font-weight:700;color:#008B99;text-align:right;padding:16px;border-radius:12px;background:linear-gradient(135deg,rgba(0,139,153,0.06),rgba(120,190,32,0.06))}
      @media print{body{padding:0}}</style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:32px">
        <div><h1 style="background:linear-gradient(90deg,#008B99,#78BE20);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0">RoofBack</h1></div>
        <div style="text-align:right"><p style="margin:0;font-weight:600">${job?.client_name}</p>
        <p style="margin:2px 0;color:#666;font-size:14px">${job?.client_address || ''}</p>
        <p style="margin:2px 0;color:#666;font-size:14px">${job?.client_phone || ''}</p>
        <p style="margin:2px 0;color:#999;font-size:12px">${new Date().toLocaleDateString()}</p></div></div>
      ${materialRows.length > 0 ? `<h3 style="color:#64748b;font-size:14px;text-transform:uppercase;letter-spacing:1px">${lang === 'es' ? 'Materiales' : 'Materials'}</h3><table><thead><tr><th>Item</th><th style="text-align:center">${lang === 'es' ? 'Cantidad' : 'Qty'}</th><th style="text-align:right">Total</th></tr></thead><tbody>${renderRows(materialRows)}</tbody></table>` : ''}
      ${laborRows.length > 0 ? `<h3 style="color:#64748b;font-size:14px;text-transform:uppercase;letter-spacing:1px">${lang === 'es' ? 'Mano de obra' : 'Labor'}</h3><table><thead><tr><th>Item</th><th style="text-align:center">${lang === 'es' ? 'Cantidad' : 'Qty'}</th><th style="text-align:right">Total</th></tr></thead><tbody>${renderRows(laborRows)}</tbody></table>` : ''}
      ${otherRows.length > 0 ? `<h3 style="color:#64748b;font-size:14px;text-transform:uppercase;letter-spacing:1px">${lang === 'es' ? 'Otros' : 'Other'}</h3><table><thead><tr><th>Item</th><th style="text-align:center">${lang === 'es' ? 'Cantidad' : 'Qty'}</th><th style="text-align:right">Total</th></tr></thead><tbody>${renderRows(otherRows)}</tbody></table>` : ''}
      <div class="total-row" style="margin-top:24px">TOTAL: ${formatMoney(calc.total)}</div>
      <p style="text-align:center;color:#999;font-size:12px;margin-top:32px">Generado con RoofBack</p>
      <script>setTimeout(()=>window.print(),500)</script></body></html>`)
    }
    w.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#008B99] animate-spin" />
      </div>
    )
  }

  const renderSection = (category: 'material' | 'labor' | 'other', title: string) => {
    const sectionItems = items
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .filter((i) => i.category === category)

    return (
      <Card className="border-0 shadow-sm bg-white rounded-2xl">
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wider">{title}</h3>

          {category === 'material' && sectionItems.length > 0 && (
            <div className="mb-3 p-3 rounded-xl bg-gradient-brand-subtle border border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#008B99]" />
                <span className="text-xs text-slate-600">
                  {lang === 'es'
                    ? 'Marcas sugeridas: GAF / Owens Corning / CertainTeed'
                    : 'Suggested brands: GAF / Owens Corning / CertainTeed'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {sectionItems.map((item) => (
              <div key={item.originalIndex} className="flex items-start gap-2 pb-3 border-b border-slate-100 last:border-0">
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.originalIndex, 'name', e.target.value)}
                    placeholder={lang === 'es' ? 'Nombre del item' : 'Item name'}
                    className="h-10 text-sm font-medium bg-slate-50/50 border-slate-200 rounded-xl"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[11px] text-slate-400">{t('estimate.qty')}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.originalIndex, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm bg-slate-50/50 border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-400">{t('estimate.unit')}</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(item.originalIndex, 'unit', e.target.value)}
                        className="h-9 text-sm bg-slate-50/50 border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-400">$/u</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.originalIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm bg-slate-50/50 border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <p className="text-right text-sm font-semibold text-slate-700 tabular-nums">
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
            className="w-full mt-2 text-[#008B99] hover:text-[#006d78] hover:bg-[#008B99]/5"
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-slate-400 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {job?.client_name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t('estimate.title')}</h1>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Mode Toggle */}
        <div className="flex bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm">
          <button
            onClick={() => setMode('simple')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === 'simple'
                ? 'bg-gradient-brand text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Zap className="h-4 w-4" />
            {lang === 'es' ? 'Simple' : 'Simple'}
          </button>
          <button
            onClick={() => {
              setMode('itemized')
              if (items.length === 0 && job) {
                loadTemplate(job.job_type as JobType, Number(job.square_footage) || 1000)
              }
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === 'itemized'
                ? 'bg-gradient-brand text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="h-4 w-4" />
            {lang === 'es' ? 'Detallado' : 'Itemized'}
          </button>
        </div>

        {/* ===== SIMPLE MODE ===== */}
        {mode === 'simple' && (
          <>
            <Card className="border-0 shadow-sm bg-white rounded-2xl">
              <CardContent className="p-5 space-y-5">
                <div className="text-center space-y-2">
                  <Label className="text-slate-500 text-sm">
                    {lang === 'es' ? 'Precio total del trabajo' : 'Total job price'}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-light">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={simpleTotal || ''}
                      onChange={(e) => setSimpleTotal(parseFloat(e.target.value) || 0)}
                      placeholder="5,000"
                      className="h-16 text-3xl font-bold text-center tabular-nums bg-slate-50/50 border-slate-200 rounded-2xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 text-sm">
                    {lang === 'es' ? 'Descripción / Alcance del trabajo' : 'Description / Scope of work'}
                  </Label>
                  <Textarea
                    value={simpleDescription}
                    onChange={(e) => setSimpleDescription(e.target.value)}
                    placeholder={lang === 'es'
                      ? 'Ej: Retecho completo de 2,000 sqft. Incluye remoción de tejas viejas, instalación de underlayment nuevo, tejas arquitectónicas GAF Timberline, ventilación de cumbrera...'
                      : 'Ex: Full reroof of 2,000 sqft. Includes removal of old shingles, new underlayment installation, GAF Timberline architectural shingles, ridge ventilation...'}
                    className="min-h-[140px] text-base bg-slate-50/50 border-slate-200 rounded-xl resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== ITEMIZED MODE ===== */}
        {mode === 'itemized' && (
          <>
            {renderSection('material', lang === 'es' ? 'Materiales' : 'Materials')}
            {renderSection('labor', lang === 'es' ? 'Mano de obra' : 'Labor')}
            {renderSection('other', lang === 'es' ? 'Otros' : 'Other')}

            {/* Totals Card */}
            <Card className="border-t-gradient border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-slate-400">{t('estimate.overheadPct')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={overheadPct}
                      onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)}
                      className="h-10 bg-slate-50/50 border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-400">{t('estimate.marginPct')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={marginPct}
                      onChange={(e) => setMarginPct(parseFloat(e.target.value) || 0)}
                      className="h-10 bg-slate-50/50 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <Separator className="bg-slate-100" />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('estimate.subtotalMaterials')}</span>
                    <span className="tabular-nums">{formatMoney(calc.materials)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('estimate.subtotalLabor')}</span>
                    <span className="tabular-nums">{formatMoney(calc.labor)}</span>
                  </div>
                  {calc.other > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('estimate.subtotalOther')}</span>
                      <span className="tabular-nums">{formatMoney(calc.other)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('estimate.overhead')} ({overheadPct}%)</span>
                    <span className="tabular-nums">{formatMoney(calc.overhead)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('estimate.margin')} ({marginPct}%)</span>
                    <span className="tabular-nums">{formatMoney(calc.margin)}</span>
                  </div>
                  <Separator className="bg-slate-100" />
                  <div className="flex justify-between text-lg font-bold pt-1">
                    <span className="text-gradient-brand">{t('estimate.grandTotal')}</span>
                    <span className="text-gradient-brand tabular-nums">{formatMoney(calc.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== ACTIONS ===== */}
        <div className="space-y-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-base font-medium rounded-2xl btn-gradient flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? t('estimate.saving') : t('estimate.save')}
          </button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleGeneratePdf}
              className="h-12 rounded-xl border-slate-200"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSendDialog(true)}
              className="h-12 rounded-xl border-slate-200 text-[#008B99]"
            >
              <Send className="h-4 w-4 mr-1" />
              {lang === 'es' ? 'Enviar' : 'Send'}
            </Button>
            <Button
              variant="outline"
              onClick={handleAccepted}
              className="h-12 rounded-xl border-[#78BE20]/30 text-[#3D7A00] hover:bg-[#78BE20]/5"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {lang === 'es' ? 'Aceptar' : 'Accept'}
            </Button>
          </div>
        </div>
      </div>

      {/* Send to Client Dialog */}
      {showSendDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSendDialog(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {lang === 'es' ? 'Enviar presupuesto al cliente' : 'Send estimate to client'}
            </h3>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">{lang === 'es' ? 'Email del cliente' : 'Client email'}</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="h-12 rounded-xl bg-slate-50/50 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">{lang === 'es' ? 'Link de propuesta' : 'Proposal link'}</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/proposal/${job?.public_token}`}
                  className="h-10 text-xs bg-slate-50 border-slate-200 rounded-lg flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-10 rounded-lg px-3">
                  {lang === 'es' ? 'Copiar' : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => setShowSendDialog(false)}
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <button
                onClick={handleSendToClient}
                disabled={!clientEmail}
                className="flex-1 h-12 rounded-xl btn-gradient flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {lang === 'es' ? 'Enviar email' : 'Send email'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  )
}
