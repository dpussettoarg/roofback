'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Layers, ChevronRight, Loader2, Star } from 'lucide-react'
import Image from 'next/image'

export interface JobTemplateMaterial {
  name: string
  name_es: string
  category: 'material' | 'labor' | 'other'
  quantity: number
  unit: string
  unit_price: number
  checklist_qty?: number
  checklist_unit?: string
  note?: string
}

export interface JobTemplate {
  id: string
  name: string
  name_es: string
  description: string
  description_es: string
  is_sponsored: boolean
  brand_logo: string | null
  sort_order: number
  default_materials: JobTemplateMaterial[]
}

interface Props {
  open: boolean
  lang: 'es' | 'en'
  squareFootage?: number          // used to scale quantities
  onSelect: (template: JobTemplate, scaledItems: JobTemplateMaterial[]) => void
  onClose: () => void
}

/** Scale item quantities proportionally from base 1,000 sqft to actual sqft */
function scaleItems(items: JobTemplateMaterial[], sqft: number): JobTemplateMaterial[] {
  const ratio = Math.max(sqft, 100) / 1000
  return items.map((item) => ({
    ...item,
    quantity: Math.max(1, Math.round(item.quantity * ratio)),
    checklist_qty: item.checklist_qty
      ? Math.max(1, Math.round(item.checklist_qty * ratio))
      : undefined,
  }))
}

export function TemplateSelector({ open, lang, squareFootage = 1000, onSelect, onClose }: Props) {
  const supabase = createClient()
  const [templates, setTemplates] = useState<JobTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JobTemplate | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('job_templates')
      .select('*')
      .eq('is_system', true)
      .order('sort_order')
    setTemplates((data as JobTemplate[]) || [])
    setLoading(false)
  }

  function handleSelect(tmpl: JobTemplate) {
    const scaled = scaleItems(tmpl.default_materials, squareFootage)
    onSelect(tmpl, scaled)
    onClose()
  }

  if (!open) return null

  const templateColors = [
    'border-[#A8FF3E]/40 bg-[#A8FF3E]/5',
    'border-blue-400/40 bg-blue-400/5',
    'border-orange-400/40 bg-orange-400/5',
    'border-purple-400/40 bg-purple-400/5',
  ]
  const accentColors = ['text-[#A8FF3E]', 'text-blue-400', 'text-orange-400', 'text-purple-400']

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#1E2228] border border-[#2A2D35] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2A2D35] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-[#A8FF3E]" />
            <div>
              <h2 className="text-base font-bold text-white">
                {lang === 'es' ? 'Plantillas de techo' : 'Roof Templates'}
              </h2>
              <p className="text-xs text-[#6B7280]">
                {squareFootage > 0
                  ? (lang === 'es' ? `Escalado a ${squareFootage} ft²` : `Scaled to ${squareFootage} ft²`)
                  : (lang === 'es' ? 'Seleccioná una para auto-completar' : 'Select one to auto-populate')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#2A2D35] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Template list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 text-[#A8FF3E] animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-center text-sm text-[#6B7280] py-8">
              {lang === 'es' ? 'No hay plantillas disponibles' : 'No templates available'}
            </p>
          ) : (
            templates.map((tmpl, i) => {
              const isOpen = selected?.id === tmpl.id
              return (
                <div
                  key={tmpl.id}
                  className={`rounded-xl border transition-all overflow-hidden ${templateColors[i % 4]}`}
                >
                  {/* Template header row */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
                    onClick={() => setSelected(isOpen ? null : tmpl)}
                  >
                    {/* Rank badge */}
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[#0F1117] ${accentColors[i % 4]}`}>
                      {i + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white leading-tight">
                          {lang === 'es' ? tmpl.name_es : tmpl.name}
                        </p>
                        {tmpl.is_sponsored && tmpl.brand_logo && (
                          <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5">
                            <Star className="h-2.5 w-2.5 text-amber-400" />
                            <span className="text-[10px] text-amber-400 font-semibold">Sponsored</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-2 leading-relaxed">
                        {lang === 'es' ? tmpl.description_es : tmpl.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {tmpl.is_sponsored && tmpl.brand_logo && (
                        <Image src={tmpl.brand_logo} alt="Brand" width={40} height={20} className="object-contain" />
                      )}
                      <ChevronRight className={`h-4 w-4 text-[#4B5563] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded preview of materials */}
                  {isOpen && (
                    <div className="border-t border-[#2A2D35] px-4 pb-4">
                      <p className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider mt-3 mb-2">
                        {lang === 'es' ? `Materiales incluidos (base 1,000 ft²)` : `Included items (base 1,000 ft²)`}
                      </p>
                      <div className="space-y-1 mb-4">
                        {tmpl.default_materials.filter(m => m.category === 'material').map((m, j) => (
                          <div key={j} className="flex items-center justify-between text-xs">
                            <span className="text-[#9CA3AF] truncate mr-2">
                              {lang === 'es' ? m.name_es : m.name}
                            </span>
                            <span className="text-[#6B7280] flex-shrink-0">{m.quantity} {m.unit}</span>
                          </div>
                        ))}
                        {tmpl.default_materials.filter(m => m.category === 'labor').length > 0 && (
                          <>
                            <div className="pt-1.5 border-t border-[#2A2D35]/60 mt-2">
                              <p className="text-[10px] text-[#6B7280] uppercase font-medium mb-1">
                                {lang === 'es' ? 'Mano de obra' : 'Labor'}
                              </p>
                            </div>
                            {tmpl.default_materials.filter(m => m.category === 'labor').map((m, j) => (
                              <div key={j} className="flex items-center justify-between text-xs">
                                <span className="text-[#9CA3AF] truncate mr-2">
                                  {lang === 'es' ? m.name_es : m.name}
                                </span>
                                <span className="text-[#6B7280] flex-shrink-0">{m.quantity} {m.unit}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleSelect(tmpl)}
                        className={`w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${accentColors[i % 4]} border ${templateColors[i % 4]} hover:bg-white/10`}
                      >
                        <Layers className="h-4 w-4" />
                        {lang === 'es' ? 'Cargar esta plantilla' : 'Load this template'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 border-t border-[#2A2D35] flex-shrink-0">
          <p className="text-[11px] text-[#4B5563] text-center">
            {lang === 'es'
              ? 'Las cantidades se escalan automáticamente a la superficie del trabajo. Podés editar todo después.'
              : 'Quantities are automatically scaled to the job area. You can edit everything after loading.'}
          </p>
        </div>
      </div>
    </div>
  )
}
