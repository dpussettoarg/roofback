'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, X, Loader2, FileText, Hammer, MapPin, Phone, Calendar, Clock, CreditCard } from 'lucide-react'
import { PAYMENT_TERMS_OPTIONS, translateMaterialName } from '@/lib/types'
import type { Job, EstimateItem } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

type ViewState = 'loading' | 'proposal' | 'signing' | 'approved' | 'not_found' | 'already_approved'

export default function ProposalPage() {
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()

  const [state, setState] = useState<ViewState>('loading')
  const [job, setJob] = useState<Job | null>(null)
  const [items, setItems] = useState<EstimateItem[]>([])
  const [contractor, setContractor] = useState<{ full_name: string; company_name: string; phone: string } | null>(null)
  const [signatureName, setSignatureName] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [approving, setApproving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Determine output language from job
  const isEn = job?.language_output === 'en'

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('public_token', token).single()
      if (!jobData) { setState('not_found'); return }
      const j = jobData as Job
      setJob(j)
      if (j.client_status === 'approved') { setState('already_approved'); return }

      const { data: profile } = await supabase.from('profiles').select('full_name, company_name, phone').eq('id', j.user_id).single()
      if (profile) setContractor(profile)

      if (j.estimate_mode === 'itemized') {
        const { data: est } = await supabase.from('estimate_items').select('*').eq('job_id', j.id).order('sort_order')
        if (est) setItems(est as EstimateItem[])
      }
      setState('proposal')
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current; if (!canvas) return
    setIsDrawing(true)
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath(); ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0F172A'
    ctx.lineTo(x, y); ctx.stroke()
  }, [isDrawing])

  const stopDraw = useCallback(() => setIsDrawing(false), [])

  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function handleApprove() {
    setApproving(true)
    const canvas = canvasRef.current
    const signatureData = canvas ? canvas.toDataURL('image/png') : ''
    await supabase.from('jobs').update({
      client_status: 'approved', client_signature: signatureName || signatureData,
      approved_at: new Date().toISOString(), status: 'approved', workflow_stage: 'approved',
      updated_at: new Date().toISOString(),
    }).eq('public_token', token)
    setState('approved')
    setApproving(false)
  }

  // ===== STATES =====
  if (state === 'loading') return <div className="flex items-center justify-center min-h-screen bg-white"><div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#008B99] animate-spin" /></div>

  if (state === 'not_found') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
      <FileText className="h-12 w-12 text-slate-300 mb-4" />
      <h1 className="text-xl font-semibold text-slate-900">{isEn ? 'Proposal not found' : 'Propuesta no encontrada'}</h1>
      <p className="text-slate-500 mt-2">{isEn ? 'This link may be invalid or expired.' : 'Este link puede ser inválido o expirado.'}</p>
    </div>
  )

  if (state === 'already_approved') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#78BE20]/10 flex items-center justify-center mb-4"><CheckCircle className="h-8 w-8 text-[#78BE20]" /></div>
      <h1 className="text-2xl font-bold text-slate-900">{isEn ? 'Proposal Approved' : 'Propuesta Aprobada'}</h1>
      <p className="text-slate-500 mt-2">{isEn ? 'Approved on' : 'Aprobado el'} {job?.approved_at ? new Date(job.approved_at).toLocaleDateString() : ''}</p>
    </div>
  )

  if (state === 'approved') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-brand flex items-center justify-center mb-6"><CheckCircle className="h-10 w-10 text-white" /></div>
      <h1 className="text-3xl font-bold text-slate-900">{isEn ? 'Thank you!' : '¡Gracias!'}</h1>
      <p className="text-slate-500 mt-3 text-lg">{isEn ? `Your estimate has been approved. ${contractor?.full_name || 'Your contractor'} will be in touch shortly.` : `Tu presupuesto fue aprobado. ${contractor?.full_name || 'Tu techista'} se va a contactar pronto.`}</p>
      <p className="text-xs text-slate-400 mt-8">Powered by RoofBack</p>
    </div>
  )

  // ===== SIGNING =====
  if (state === 'signing') return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">{isEn ? 'Approve & Sign' : 'Aprobar y Firmar'}</h2>
        <button onClick={() => setState('proposal')} className="p-2 text-slate-400"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 px-5 py-6 space-y-5">
        <div className="text-center">
          <p className="text-3xl font-bold text-gradient-brand tabular-nums">{formatMoney(Number(job?.estimated_total) || 0)}</p>
          <p className="text-slate-500 text-sm mt-1">{isEn ? 'Total estimate' : 'Total presupuesto'}</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600 font-medium">{isEn ? 'Your name' : 'Tu nombre'}</label>
          <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder={isEn ? 'Full name' : 'Nombre completo'} className="h-12 text-base rounded-xl bg-slate-50/50 border-slate-200" />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600 font-medium">{isEn ? 'Draw your signature' : 'Dibujá tu firma'}</label>
          <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30 overflow-hidden">
            <canvas ref={canvasRef} width={320} height={150} className="w-full touch-none cursor-crosshair" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
            <button onClick={clearCanvas} className="absolute top-2 right-2 text-xs text-slate-400 bg-white/80 rounded-lg px-2 py-1">{isEn ? 'Clear' : 'Limpiar'}</button>
          </div>
        </div>
        <p className="text-xs text-slate-400 text-center">{isEn ? 'By clicking "Approve", you agree to this estimate.' : 'Al hacer clic en "Aprobar", aceptás este presupuesto.'}</p>
      </div>
      <div className="px-5 pb-8 pt-4 border-t border-slate-100">
        <button onClick={handleApprove} disabled={approving || !signatureName} className="w-full h-14 text-lg font-semibold rounded-2xl btn-gradient flex items-center justify-center gap-2 disabled:opacity-50">
          {approving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
          {approving ? (isEn ? 'Approving...' : 'Aprobando...') : (isEn ? 'Approve Estimate' : 'Aprobar Presupuesto')}
        </button>
      </div>
    </div>
  )

  // ===== PROPOSAL VIEW =====
  const materialItems = items.filter(i => i.category === 'material')
  const laborItems = items.filter(i => i.category === 'labor')
  const otherItems = items.filter(i => i.category === 'other')
  const ptLabel = PAYMENT_TERMS_OPTIONS.find(p => p.value === job?.payment_terms)

  const getName = (name: string) => isEn ? translateMaterialName(name) : name

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 pt-10 pb-8 text-center border-b border-slate-100">
        <Image src={isEn ? '/LOGO/4.png' : '/LOGO/3.png'} alt="RoofBack" width={160} height={45} className="h-10 w-auto mx-auto mb-6" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mb-4">
          <FileText className="h-3.5 w-3.5" />
          {isEn ? 'ESTIMATE' : 'PRESUPUESTO'}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{job?.client_name}</h1>
        <p className="text-slate-400 text-sm mt-1">
          <Calendar className="h-3.5 w-3.5 inline mr-1" />
          {new Date(job?.created_at || '').toLocaleDateString(isEn ? 'en-US' : 'es', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-lg mx-auto">
        {/* Client Info */}
        <div className="space-y-2">
          {job?.client_address && <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 text-slate-400" />{job.client_address}</div>}
          {job?.client_phone && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{job.client_phone}</div>}
          {contractor && <div className="flex items-center gap-2 text-sm text-slate-600"><Hammer className="h-4 w-4 text-slate-400" />{contractor.company_name || contractor.full_name}</div>}
        </div>

        {/* Schedule & Terms */}
        {(job?.start_date || job?.payment_terms) && (
          <div className="grid grid-cols-2 gap-3">
            {job?.start_date && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                  <Calendar className="h-3 w-3" />
                  {isEn ? 'START DATE' : 'INICIO'}
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(job.start_date + 'T12:00').toLocaleDateString(isEn ? 'en-US' : 'es', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
            {job?.duration_days && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                  <Clock className="h-3 w-3" />
                  {isEn ? 'DURATION' : 'DURACIÓN'}
                </div>
                <p className="text-sm font-semibold text-slate-800">{job.duration_days} {isEn ? 'days' : 'días'}</p>
              </div>
            )}
            {ptLabel && (
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                  <CreditCard className="h-3 w-3" />
                  {isEn ? 'PAYMENT TERMS' : 'CONDICIONES DE PAGO'}
                </div>
                <p className="text-sm font-semibold text-slate-800">{isEn ? ptLabel.label_en : ptLabel.label_es}</p>
              </div>
            )}
          </div>
        )}

        {/* Photos Gallery */}
        {job?.photos && job.photos.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {isEn ? 'Job Photos' : 'Fotos del trabajo'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {job.photos.map((url, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-100">
                  <Image src={url} alt="" fill className="object-cover" sizes="250px" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simple Mode */}
        {job?.estimate_mode === 'simple' && job?.simple_description && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{isEn ? 'Scope of Work' : 'Alcance del Trabajo'}</h3>
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">{job.simple_description}</div>
          </div>
        )}

        {/* Itemized */}
        {job?.estimate_mode === 'itemized' && (
          <>
            {materialItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{isEn ? 'Materials' : 'Materiales'}</h3>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  {materialItems.map((item, i) => (
                    <div key={item.id} className={`flex justify-between py-3 px-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <div><p className="text-sm text-slate-800 font-medium">{getName(item.name)}</p><p className="text-xs text-slate-400">{item.quantity} {item.unit}</p></div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatMoney(Number(item.quantity) * Number(item.unit_price))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {laborItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{isEn ? 'Labor' : 'Mano de Obra'}</h3>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  {laborItems.map((item, i) => (
                    <div key={item.id} className={`flex justify-between py-3 px-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <div><p className="text-sm text-slate-800 font-medium">{getName(item.name)}</p><p className="text-xs text-slate-400">{item.quantity} {item.unit}</p></div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatMoney(Number(item.quantity) * Number(item.unit_price))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {otherItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{isEn ? 'Other' : 'Otros'}</h3>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  {otherItems.map((item, i) => (
                    <div key={item.id} className={`flex justify-between py-3 px-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <div><p className="text-sm text-slate-800 font-medium">{getName(item.name)}</p><p className="text-xs text-slate-400">{item.quantity} {item.unit}</p></div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatMoney(Number(item.quantity) * Number(item.unit_price))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Total */}
        <div className="border-t-gradient rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 text-center bg-gradient-brand-subtle">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">{isEn ? 'Total Estimate' : 'Total Presupuesto'}</p>
            <p className="text-4xl font-bold text-slate-900 tabular-nums">{formatMoney(Number(job?.estimated_total) || 0)}</p>
          </div>
        </div>

        {/* Approve */}
        <button onClick={() => setState('signing')} className="w-full h-14 text-lg font-semibold rounded-2xl btn-gradient flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {isEn ? 'Approve Estimate' : 'Aprobar Presupuesto'}
        </button>

        <p className="text-xs text-slate-400 text-center pb-6">Powered by RoofBack</p>
      </div>
    </div>
  )
}
