'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Loader2,
  Plus, Trash2, BookOpen, X, Package, Layers,
} from 'lucide-react'
import { TemplateSelector, type JobTemplate, type JobTemplateMaterial } from '@/components/app/template-selector'
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

interface TemplateItem {
  name: string
  quantity_needed: number
  unit: string
  provider?: string
}

interface Template {
  id: string
  name: string
  items: TemplateItem[]
}

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [items, setItems] = useState<LocalChecklist[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showScratchModal, setShowScratchModal] = useState(false)
  const [showSystemTemplates, setShowSystemTemplates] = useState(false)
  const [scratchName, setScratchName] = useState('')
  const [scratchQty, setScratchQty] = useState('1')
  const [scratchUnit, setScratchUnit] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

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

      // Load templates for this user
      if (user) {
        const { data: tmpl } = await supabase
          .from('material_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at')
        setTemplates((tmpl as Template[]) || [])
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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

    setItems((prev) => [
      ...prev,
      ...estimateItems.map((ei: EstimateItem) => ({
        estimate_item_id: ei.id,
        name: ei.name,
        quantity_needed: Number(ei.quantity),
        unit: ei.unit,
        is_checked: false,
        actual_cost: null,
      })),
    ])
    toast.success(lang === 'es' ? 'Materiales agregados del presupuesto' : 'Materials added from estimate')
  }

  function loadTemplate(tmpl: Template) {
    setItems((prev) => [
      ...prev,
      ...tmpl.items.map((ti) => ({
        estimate_item_id: null,
        name: ti.name,
        quantity_needed: Number(ti.quantity_needed) || 1,
        unit: ti.unit || '',
        is_checked: false,
        actual_cost: null,
      })),
    ])
    setShowTemplateModal(false)
    toast.success(lang === 'es' ? `Plantilla "${tmpl.name}" cargada` : `Template "${tmpl.name}" loaded`)
  }

  function loadSystemTemplate(_tmpl: JobTemplate, scaledItems: JobTemplateMaterial[]) {
    // Only append material-category items to the purchase checklist
    const materialItems = scaledItems.filter((m) => m.category === 'material')
    setItems((prev) => [
      ...prev,
      ...materialItems.map((m) => ({
        estimate_item_id: null,
        name: lang === 'es' ? m.name_es : m.name,
        quantity_needed: m.checklist_qty ?? m.quantity,
        unit: m.checklist_unit ?? m.unit,
        is_checked: false,
        actual_cost: null,
      })),
    ])
    toast.success(
      lang === 'es'
        ? `${materialItems.length} materiales cargados. ¡Editá las cantidades!`
        : `${materialItems.length} materials loaded. Edit quantities as needed!`
    )
  }

  function addScratchItem() {
    if (!scratchName.trim()) {
      toast.error(lang === 'es' ? 'Ingresá un nombre' : 'Enter a name')
      return
    }
    setItems((prev) => [
      ...prev,
      {
        estimate_item_id: null,
        name: scratchName.trim(),
        quantity_needed: parseFloat(scratchQty) || 1,
        unit: scratchUnit.trim(),
        is_checked: false,
        actual_cost: null,
      },
    ])
    setScratchName('')
    setScratchQty('1')
    setScratchUnit('')
  }

  function toggleCheck(index: number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, is_checked: !item.is_checked } : item)))
  }

  function updateActualCost(index: number, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, actual_cost: value ? parseFloat(value) : null } : item))
    )
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const allChecked = items.length > 0 && items.every((i) => i.is_checked)
  const checkedCount = items.filter((i) => i.is_checked).length

  const totalActual = useMemo(
    () => items.reduce((s, i) => s + (i.actual_cost || 0), 0),
    [items]
  )

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
      <div className="flex items-center justify-center min-h-screen bg-[#0F1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2A2D35] border-t-[#A8FF3E]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      {/* Header */}
      <div className="border-b border-[#2A2D35] px-4 pt-12 pb-4 max-w-2xl mx-auto">
        <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-[#6B7280] mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {job?.client_name}
        </Link>
        <h1 className="text-2xl font-bold text-white">{t('checklist.title')}</h1>
        <p className="text-sm text-[#6B7280] mt-1">{t('checklist.subtitle')}</p>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* Status bar */}
        {items.length > 0 && (
          <div className={`rounded-lg bg-[#1E2228] border border-[#2A2D35] ${
            allChecked ? 'border-l-4 border-l-[#A8FF3E]' : 'border-l-4 border-l-amber-400'
          }`}>
            <div className="p-4 flex items-center gap-3">
              {allChecked
                ? <CheckCircle className="h-6 w-6 text-[#A8FF3E]" />
                : <AlertCircle className="h-6 w-6 text-amber-500" />
              }
              <div>
                <p className="font-semibold text-sm text-white">
                  {allChecked ? t('checklist.allReady') : t('checklist.notReady')}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {checkedCount}/{items.length} items
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons — always visible */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={generateFromEstimate}
            className="h-11 rounded-lg border border-[#2A2D35] bg-[#1E2228] text-[#A8FF3E] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#252930] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {lang === 'es' ? 'Del presupuesto' : 'From estimate'}
          </button>

          <button
            onClick={() => setShowScratchModal(true)}
            className="h-11 rounded-lg border border-[#2A2D35] bg-[#1E2228] text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#252930] transition-colors"
          >
            <Plus className="h-4 w-4 text-[#A8FF3E]" />
            {lang === 'es' ? 'Agregar ítem' : 'Add item'}
          </button>

          {/* System roof templates */}
          <button
            onClick={() => setShowSystemTemplates(true)}
            className="h-11 rounded-lg border border-dashed border-[#A8FF3E]/50 bg-[#A8FF3E]/5 text-[#A8FF3E] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#A8FF3E]/10 transition-colors col-span-2"
          >
            <Layers className="h-4 w-4" />
            {lang === 'es' ? 'Cargar plantilla de techo' : 'Load roof template'}
          </button>

          {/* User saved templates */}
          {templates.length > 0 && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className="h-11 rounded-lg border border-[#2A2D35] bg-[#1E2228] text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#252930] transition-colors col-span-2"
            >
              <BookOpen className="h-4 w-4 text-[#A8FF3E]" />
              {lang === 'es' ? 'Mis plantillas guardadas' : 'My saved templates'}
            </button>
          )}
        </div>

        {/* Checklist items */}
        {items.length > 0 && (
          <div className="rounded-lg bg-[#1E2228] border border-[#2A2D35]">
            <div className="p-4 space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 pb-3 border-b border-[#2A2D35] last:border-0 ${
                    item.is_checked ? 'opacity-60' : ''
                  }`}
                >
                  <Checkbox
                    checked={item.is_checked}
                    onCheckedChange={() => toggleCheck(idx)}
                    className="mt-1 h-6 w-6 border-[#2A2D35] data-[state=checked]:bg-[#A8FF3E] data-[state=checked]:border-[#A8FF3E] data-[state=checked]:text-[#0F1117]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${item.is_checked ? 'line-through text-[#6B7280]' : 'text-white'}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {item.quantity_needed} {item.unit}
                    </p>
                    <div className="mt-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t('checklist.actualCost')}
                        value={item.actual_cost ?? ''}
                        onChange={(e) => updateActualCost(idx, e.target.value)}
                        className="input-dark h-9 text-sm w-32 rounded-md border border-[#2A2D35] bg-[#16191F] px-3 text-white placeholder:text-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#A8FF3E] focus:border-[#A8FF3E]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="mt-1 p-1.5 rounded text-[#4B5563] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {totalActual > 0 && (
                <div className="pt-2 text-sm flex justify-between font-semibold text-white">
                  <span>{t('checklist.totalActual')}</span>
                  <span>{formatMoney(totalActual)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save */}
        {items.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-lime w-full h-12 rounded-lg bg-[#A8FF3E] text-[#0F1117] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#9AEF36] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('checklist.save')}
          </button>
        )}

        {items.length === 0 && (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-10 text-center">
            <Package className="h-8 w-8 text-[#A8FF3E] mx-auto mb-3" />
            <p className="text-[#6B7280] text-sm">
              {lang === 'es'
                ? 'Usá los botones de arriba para generar o agregar materiales.'
                : 'Use the buttons above to generate or add materials.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Template picker modal ──────────────────────────────────────── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplateModal(false)} />
          <div className="relative bg-[#1E2228] rounded-t-2xl sm:rounded-[12px] w-full sm:max-w-md p-6 pb-8 shadow-xl border border-[#2A2D35] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">
                {lang === 'es' ? 'Mis plantillas' : 'My templates'}
              </h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-[#6B7280] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => loadTemplate(tmpl)}
                  className="w-full text-left bg-[#16191F] border border-[#2A2D35] rounded-xl p-4 hover:border-[#A8FF3E] transition-all"
                >
                  <p className="font-semibold text-white text-sm">{tmpl.name}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {tmpl.items.length} {lang === 'es' ? 'ítems' : 'items'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add item from scratch modal ────────────────────────────────── */}
      {showScratchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowScratchModal(false)} />
          <div className="relative bg-[#1E2228] rounded-t-2xl sm:rounded-[12px] w-full sm:max-w-md p-6 pb-8 space-y-4 shadow-xl border border-[#2A2D35]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {lang === 'es' ? 'Agregar ítem' : 'Add item'}
              </h3>
              <button onClick={() => setShowScratchModal(false)} className="text-[#6B7280] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-[#6B7280]">{lang === 'es' ? 'Nombre del material' : 'Material name'}</label>
                <input
                  autoFocus
                  value={scratchName}
                  onChange={(e) => setScratchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addScratchItem()}
                  placeholder={lang === 'es' ? 'Ej: Shingles 30 yr' : 'E.g.: 30yr Shingles'}
                  className="w-full h-12 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#6B7280]">{lang === 'es' ? 'Cantidad' : 'Quantity'}</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={scratchQty}
                    onChange={(e) => setScratchQty(e.target.value)}
                    className="w-full h-12 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm focus:outline-none focus:border-[#A8FF3E] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#6B7280]">{lang === 'es' ? 'Unidad' : 'Unit'}</label>
                  <input
                    value={scratchUnit}
                    onChange={(e) => setScratchUnit(e.target.value)}
                    placeholder={lang === 'es' ? 'sq, und, m²...' : 'sq, unit, m²...'}
                    className="w-full h-12 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowScratchModal(false)}
                className="flex-1 h-12 rounded-lg border border-[#2A2D35] bg-transparent text-[#6B7280] text-sm hover:bg-[#252830]"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => { addScratchItem(); setShowScratchModal(false) }}
                disabled={!scratchName.trim()}
                className="flex-1 h-12 rounded-lg bg-[#A8FF3E] text-[#0F1117] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {lang === 'es' ? 'Agregar' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Template Selector */}
      <TemplateSelector
        open={showSystemTemplates}
        lang={lang as 'es' | 'en'}
        squareFootage={Number(job?.square_footage) || 1000}
        onSelect={loadSystemTemplate}
        onClose={() => setShowSystemTemplates(false)}
      />

      <MobileNav />
    </div>
  )
}
