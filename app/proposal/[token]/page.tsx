'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, X, Loader2, FileText, Hammer, MapPin, Phone, Calendar } from 'lucide-react'
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

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('public_token', token)
        .single()

      if (!jobData) {
        setState('not_found')
        return
      }

      const j = jobData as Job
      setJob(j)

      if (j.client_status === 'approved') {
        setState('already_approved')
        return
      }

      // Load contractor info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name, phone')
        .eq('id', j.user_id)
        .single()
      if (profile) setContractor(profile)

      // Load items if itemized
      if (j.estimate_mode === 'itemized') {
        const { data: est } = await supabase
          .from('estimate_items')
          .select('*')
          .eq('job_id', j.id)
          .order('sort_order')
        if (est) setItems(est as EstimateItem[])
      }

      setState('proposal')
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Canvas drawing
  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0F172A'
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing])

  const stopDraw = useCallback(() => {
    setIsDrawing(false)
  }, [])

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function handleApprove() {
    setApproving(true)
    const canvas = canvasRef.current
    const signatureData = canvas ? canvas.toDataURL('image/png') : ''

    await supabase.from('jobs').update({
      client_status: 'approved',
      client_signature: signatureName || signatureData,
      approved_at: new Date().toISOString(),
      status: 'approved',
      updated_at: new Date().toISOString(),
    }).eq('public_token', token)

    setState('approved')
    setApproving(false)
  }

  // ===== LOADING =====
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#008B99] animate-spin" />
      </div>
    )
  }

  // ===== NOT FOUND =====
  if (state === 'not_found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
        <FileText className="h-12 w-12 text-slate-300 mb-4" />
        <h1 className="text-xl font-semibold text-slate-900">Proposal not found</h1>
        <p className="text-slate-500 mt-2">This link may be invalid or expired.</p>
      </div>
    )
  }

  // ===== ALREADY APPROVED =====
  if (state === 'already_approved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#78BE20]/10 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-[#78BE20]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Proposal Approved</h1>
        <p className="text-slate-500 mt-2 max-w-xs">
          This estimate was already approved on {job?.approved_at ? new Date(job.approved_at).toLocaleDateString() : ''}.
        </p>
      </div>
    )
  }

  // ===== APPROVED (just now) =====
  if (state === 'approved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-brand flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Thank you!</h1>
        <p className="text-slate-500 mt-3 max-w-sm text-lg">
          Your estimate has been approved. {contractor?.full_name || 'Your contractor'} will be in touch shortly.
        </p>
        <p className="text-xs text-slate-400 mt-8">Powered by RoofBack</p>
      </div>
    )
  }

  // ===== SIGNING MODAL =====
  if (state === 'signing') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Approve & Sign</h2>
          <button onClick={() => setState('proposal')} className="p-2 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-5 py-6 space-y-5">
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-brand tabular-nums">{formatMoney(Number(job?.estimated_total) || 0)}</p>
            <p className="text-slate-500 text-sm mt-1">Total estimate for {job?.client_name}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-600 font-medium">Your name</label>
            <Input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Type your full name"
              className="h-12 text-base rounded-xl bg-slate-50/50 border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-600 font-medium">Draw your signature</label>
            <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={320}
                height={150}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <button
                onClick={clearCanvas}
                className="absolute top-2 right-2 text-xs text-slate-400 hover:text-slate-600 bg-white/80 rounded-lg px-2 py-1"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            By clicking &quot;Approve&quot;, you agree to the scope and total of this estimate.
          </p>
        </div>

        <div className="px-5 pb-8 pt-4 border-t border-slate-100">
          <button
            onClick={handleApprove}
            disabled={approving || !signatureName}
            className="w-full h-14 text-lg font-semibold rounded-2xl btn-gradient flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {approving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            {approving ? 'Approving...' : 'Approve Estimate'}
          </button>
        </div>
      </div>
    )
  }

  // ===== PROPOSAL VIEW =====
  const materialItems = items.filter(i => i.category === 'material')
  const laborItems = items.filter(i => i.category === 'labor')
  const otherItems = items.filter(i => i.category === 'other')

  return (
    <div className="min-h-screen bg-white">
      {/* Elegant Header */}
      <div className="px-6 pt-10 pb-8 text-center border-b border-slate-100">
        <Image
          src="/LOGO/4.png"
          alt="RoofBack"
          width={160}
          height={45}
          className="h-10 w-auto mx-auto mb-6"
        />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mb-4">
          <FileText className="h-3.5 w-3.5" />
          ESTIMATE
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{job?.client_name}</h1>
        <p className="text-slate-400 text-sm mt-1">
          <Calendar className="h-3.5 w-3.5 inline mr-1" />
          {new Date(job?.created_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-lg mx-auto">
        {/* Client/Job Info */}
        <div className="space-y-2">
          {job?.client_address && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              {job.client_address}
            </div>
          )}
          {job?.client_phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" />
              {job.client_phone}
            </div>
          )}
          {contractor && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Hammer className="h-4 w-4 text-slate-400" />
              {contractor.company_name || contractor.full_name}
            </div>
          )}
        </div>

        {/* Simple Mode Content */}
        {job?.estimate_mode === 'simple' && job?.simple_description && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Scope of Work</h3>
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">
              {job.simple_description}
            </div>
          </div>
        )}

        {/* Itemized Content */}
        {job?.estimate_mode === 'itemized' && (
          <>
            {materialItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Materials</h3>
                <div className="space-y-0 border border-slate-100 rounded-xl overflow-hidden">
                  {materialItems.map((item, i) => (
                    <div key={item.id} className={`flex justify-between py-3 px-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <div>
                        <p className="text-sm text-slate-800 font-medium">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.quantity} {item.unit}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {formatMoney(Number(item.quantity) * Number(item.unit_price))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {laborItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Labor</h3>
                <div className="space-y-0 border border-slate-100 rounded-xl overflow-hidden">
                  {laborItems.map((item, i) => (
                    <div key={item.id} className={`flex justify-between py-3 px-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <div>
                        <p className="text-sm text-slate-800 font-medium">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.quantity} {item.unit}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {formatMoney(Number(item.quantity) * Number(item.unit_price))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Other</h3>
                <div className="space-y-0 border border-slate-100 rounded-xl overflow-hidden">
                  {otherItems.map((item, i) => (
                    <div key={item.id} className={`flex justify-between py-3 px-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <div>
                        <p className="text-sm text-slate-800 font-medium">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.quantity} {item.unit}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {formatMoney(Number(item.quantity) * Number(item.unit_price))}
                      </span>
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
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Total Estimate</p>
            <p className="text-4xl font-bold text-slate-900 tabular-nums">
              {formatMoney(Number(job?.estimated_total) || 0)}
            </p>
          </div>
        </div>

        {/* Approve Button */}
        <button
          onClick={() => setState('signing')}
          className="w-full h-14 text-lg font-semibold rounded-2xl btn-gradient flex items-center justify-center gap-2"
        >
          <CheckCircle className="h-5 w-5" />
          Approve Estimate
        </button>

        <p className="text-xs text-slate-400 text-center pb-6">Powered by RoofBack</p>
      </div>
    </div>
  )
}
