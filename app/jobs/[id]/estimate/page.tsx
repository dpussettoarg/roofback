'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  Send, Zap, List, Sparkles, CalendarDays, Clock, CreditCard,
  Globe, Camera, X, ImageIcon, Wand2
} from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TEMPLATES, scaleTemplateItems } from '@/lib/templates'
import { PAYMENT_TERMS_OPTIONS, translateMaterialName } from '@/lib/types'
import type { Job, EstimateItem, JobType, Profile } from '@/lib/types'
import { pdf } from '@react-pdf/renderer'
import { EstimatePDF } from '@/components/pdf/estimate-pdf'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [job, setJob] = useState<Job | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mode, setMode] = useState<'simple' | 'itemized'>('simple')
  const [items, setItems] = useState<LocalItem[]>([])
  const [overheadPct, setOverheadPct] = useState(15)
  const [marginPct, setMarginPct] = useState(20)
  const [simpleTotal, setSimpleTotal] = useState(0)
  const [simpleDescription, setSimpleDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [improvingDesc, setImprovingDesc] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [clientEmail, setClientEmail] = useState('')

  // New fields
  const [startDate, setStartDate] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [paymentTerms, setPaymentTerms] = useState('50/50')
  const [languageOutput, setLanguageOutput] = useState<'es' | 'en'>('es')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const deadlineDate = startDate ? addDays(startDate, durationDays) : ''

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profileData) setProfile(profileData as Profile)
      }

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
      setStartDate(j.start_date || '')
      setDurationDays(j.duration_days || 1)
      setPaymentTerms(j.payment_terms || '50/50')
      setLanguageOutput(j.language_output || 'es')
      setPhotos(j.photos || [])

      const { data: existingItems } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('job_id', id)
        .order('sort_order')

      if (existingItems && existingItems.length > 0) {
        setItems(
          existingItems.map((ei: EstimateItem) => ({
            id: ei.id, category: ei.category, name: ei.name,
            quantity: Number(ei.quantity), unit: ei.unit,
            unit_price: Number(ei.unit_price), sort_order: ei.sort_order,
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
    setItems(scaled.map((ti, idx) => ({
      category: ti.category, name: ti.name, quantity: ti.quantity,
      unit: ti.unit, unit_price: ti.unit_price, sort_order: idx,
    })))
  }

  const updateItem = useCallback((index: number, field: string, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addItem = useCallback((category: 'material' | 'labor' | 'other') => {
    setItems((prev) => [...prev, { category, name: '', quantity: 1, unit: category === 'labor' ? 'horas' : 'each', unit_price: 0, sort_order: prev.length }])
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhoto(true)

    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const path = `${id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('job-photos').upload(path, file)
        if (error) throw error
        const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(path)
        newUrls.push(urlData.publicUrl)
      }
      setPhotos(prev => [...prev, ...newUrls])
      toast.success(lang === 'es' ? 'Foto(s) subida(s)' : 'Photo(s) uploaded')
    } catch {
      toast.error(lang === 'es' ? 'Error subiendo foto. Creá el bucket "job-photos" en Supabase Storage.' : 'Error uploading. Create "job-photos" bucket in Supabase Storage.')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleImproveDescription() {
    if (!simpleDescription.trim() || !job) return
    setImprovingDesc(true)
    try {
      const res = await fetch('/api/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: simpleDescription,
          jobType: job.job_type,
          roofType: job.roof_type,
          squareFootage: Number(job.square_footage) || 0,
          language: languageOutput,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else if (data.improved) {
        setSimpleDescription(data.improved)
        toast.success(
          data.source === 'ai'
            ? (lang === 'es' ? 'Descripción mejorada con IA' : 'Description improved with AI')
            : (lang === 'es' ? 'Descripción mejorada' : 'Description improved')
        )
      }
    } catch {
      toast.error(lang === 'es' ? 'Error mejorando descripción' : 'Error improving description')
    } finally {
      setImprovingDesc(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (mode === 'itemized') {
        await supabase.from('estimate_items').delete().eq('job_id', id)
        if (items.length > 0) {
          const rows = items.map((item, idx) => ({
            job_id: id, category: item.category, name: item.name,
            quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price, sort_order: idx,
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
        start_date: startDate || null,
        duration_days: durationDays,
        deadline_date: deadlineDate || null,
        payment_terms: paymentTerms,
        language_output: languageOutput,
        photos,
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
      status: 'approved', workflow_stage: 'approved',
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    toast.success(lang === 'es' ? '¡Arrancamos!' : "Let's go!")
    router.push(`/jobs/${id}`)
  }

  function handleSendToClient() {
    const proposalUrl = `${window.location.origin}/proposal/${job?.public_token}`
    const isEn = languageOutput === 'en'
    const subject = encodeURIComponent(isEn ? `Estimate for ${job?.client_name} - RoofBack` : `Presupuesto - ${job?.client_name}`)
    const body = encodeURIComponent(isEn
      ? `Hi ${job?.client_name},\n\nYou can view and approve your estimate here:\n${proposalUrl}\n\nThanks!`
      : `Hola ${job?.client_name},\n\nAcá podés ver y aprobar tu presupuesto:\n${proposalUrl}\n\nGracias!`)
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, '_blank')
    setShowSendDialog(false)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/proposal/${job?.public_token}`)
    toast.success(lang === 'es' ? '¡Link copiado!' : 'Link copied!')
  }

  async function handleGeneratePdf() {
    if (!job) return
    setGeneratingPdf(true)
    try {
      const isEn = languageOutput === 'en'
      const pdfDoc = (
        <EstimatePDF
          mode={mode}
          isEn={isEn}
          clientName={job.client_name}
          clientAddress={job.client_address || ''}
          clientEmail={job.client_email || ''}
          clientPhone={job.client_phone || ''}
          contractorName={profile?.full_name || ''}
          contractorCompany={profile?.company_name || ''}
          contractorPhone={profile?.phone || ''}
          contractorEmail={profile?.contact_email || ''}
          contractorWebsite={profile?.website || ''}
          jobId={job.id}
          createdAt={job.created_at}
          startDate={startDate}
          durationDays={durationDays}
          paymentTerms={paymentTerms}
          simpleDescription={simpleDescription}
          items={items.map(i => ({
            name: i.name,
            category: i.category,
            quantity: i.quantity,
            unit: i.unit,
            unit_price: i.unit_price,
          }))}
          subtotalMaterials={calc.materials}
          subtotalLabor={calc.labor}
          subtotalOther={calc.other}
          overhead={calc.overhead}
          overheadPct={overheadPct}
          margin={calc.margin}
          marginPct={marginPct}
          total={finalTotal}
          photos={photos}
        />
      )
      const blob = await pdf(pdfDoc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${isEn ? 'Estimate' : 'Presupuesto'}_${job.client_name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(lang === 'es' ? 'PDF descargado' : 'PDF downloaded')
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error(lang === 'es' ? 'Error generando PDF' : 'Error generating PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#008B99] animate-spin" />
      </div>
    )
  }

  const renderSection = (category: 'material' | 'labor' | 'other', title: string) => {
    const sectionItems = items.map((item, idx) => ({ ...item, originalIndex: idx })).filter((i) => i.category === category)
    return (
      <Card className="border-0 shadow-sm bg-white rounded-2xl">
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wider">{title}</h3>
          {category === 'material' && sectionItems.length > 0 && (
            <div className="mb-3 p-3 rounded-xl bg-gradient-brand-subtle border border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#008B99]" />
                <span className="text-xs text-slate-600">{lang === 'es' ? 'Marcas sugeridas: GAF / Owens Corning / CertainTeed' : 'Suggested brands: GAF / Owens Corning / CertainTeed'}</span>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {sectionItems.map((item) => (
              <div key={item.originalIndex} className="flex items-start gap-2 pb-3 border-b border-slate-100 last:border-0">
                <div className="flex-1 space-y-2">
                  <Input value={item.name} onChange={(e) => updateItem(item.originalIndex, 'name', e.target.value)} placeholder={lang === 'es' ? 'Nombre' : 'Name'} className="h-10 text-sm font-medium bg-slate-50/50 border-slate-200 rounded-xl" />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[11px] text-slate-400">{t('estimate.qty')}</Label>
                      <Input type="number" min="0" step="0.5" value={item.quantity} onChange={(e) => updateItem(item.originalIndex, 'quantity', parseFloat(e.target.value) || 0)} className="h-9 text-sm bg-slate-50/50 border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-400">{t('estimate.unit')}</Label>
                      <Input value={item.unit} onChange={(e) => updateItem(item.originalIndex, 'unit', e.target.value)} className="h-9 text-sm bg-slate-50/50 border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-400">$/u</Label>
                      <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(item.originalIndex, 'unit_price', parseFloat(e.target.value) || 0)} className="h-9 text-sm bg-slate-50/50 border-slate-200 rounded-lg" />
                    </div>
                  </div>
                  <p className="text-right text-sm font-semibold text-slate-700 tabular-nums">= {formatMoney(item.quantity * item.unit_price)}</p>
                </div>
                <button onClick={() => removeItem(item.originalIndex)} className="p-2 text-red-400 hover:text-red-600 mt-1"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-2 text-[#008B99] hover:text-[#006d78]" onClick={() => addItem(category)}><Plus className="h-4 w-4 mr-1" />{t('estimate.addItem')}</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-slate-400 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />{job?.client_name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t('estimate.title')}</h1>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Mode Toggle */}
        <div className="flex bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm">
          <button onClick={() => setMode('simple')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${mode === 'simple' ? 'bg-gradient-brand text-white shadow-md' : 'text-slate-500'}`}>
            <Zap className="h-4 w-4" />Simple
          </button>
          <button onClick={() => { setMode('itemized'); if (items.length === 0 && job) loadTemplate(job.job_type as JobType, Number(job.square_footage) || 1000) }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${mode === 'itemized' ? 'bg-gradient-brand text-white shadow-md' : 'text-slate-500'}`}>
            <List className="h-4 w-4" />{lang === 'es' ? 'Detallado' : 'Itemized'}
          </button>
        </div>

        {/* Schedule & Payment Section */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#008B99]" />
              {lang === 'es' ? 'Fechas y condiciones' : 'Schedule & Terms'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-slate-400">{lang === 'es' ? 'Fecha de inicio' : 'Start date'}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 bg-slate-50/50 border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-400">{lang === 'es' ? 'Duración (días)' : 'Duration (days)'}</Label>
                <Input type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)} className="h-10 bg-slate-50/50 border-slate-200 rounded-xl text-sm" />
              </div>
            </div>
            {startDate && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-brand-subtle">
                <Clock className="h-4 w-4 text-[#008B99]" />
                <span className="text-sm text-slate-700">
                  {lang === 'es' ? 'Fecha prometida: ' : 'Deadline: '}
                  <strong>{new Date(deadlineDate + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
                </span>
              </div>
            )}
            <div>
              <Label className="text-[11px] text-slate-400 flex items-center gap-1"><CreditCard className="h-3 w-3" />{lang === 'es' ? 'Condiciones de pago' : 'Payment terms'}</Label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full h-10 bg-slate-50/50 border border-slate-200 rounded-xl text-sm px-3 mt-1">
                {PAYMENT_TERMS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{lang === 'es' ? opt.label_es : opt.label_en}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Language Output Toggle */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#008B99]" />
            <span className="text-sm font-medium text-slate-700">{lang === 'es' ? 'Generar en Inglés' : 'Generate in English'}</span>
          </div>
          <button
            onClick={() => setLanguageOutput(languageOutput === 'es' ? 'en' : 'es')}
            className={`w-12 h-7 rounded-full transition-colors relative ${languageOutput === 'en' ? 'bg-[#008B99]' : 'bg-slate-200'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${languageOutput === 'en' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Photos Section */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Camera className="h-4 w-4 text-[#008B99]" />
              {lang === 'es' ? 'Fotos del trabajo' : 'Job Photos'}
            </h3>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
                    <Image src={url} alt="" fill className="object-cover" sizes="120px" />
                    <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full h-20 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-[#008B99] hover:text-[#008B99] transition-colors flex flex-col items-center justify-center gap-1"
            >
              {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
              <span className="text-xs">{uploadingPhoto ? (lang === 'es' ? 'Subiendo...' : 'Uploading...') : (lang === 'es' ? 'Subir fotos' : 'Upload photos')}</span>
            </button>
          </CardContent>
        </Card>

        {/* SIMPLE MODE */}
        {mode === 'simple' && (
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-5 space-y-5">
              <div className="text-center space-y-2">
                <Label className="text-slate-500 text-sm">{lang === 'es' ? 'Precio total' : 'Total price'}</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400">$</span>
                  <Input type="number" min="0" step="100" value={simpleTotal || ''} onChange={(e) => setSimpleTotal(parseFloat(e.target.value) || 0)} placeholder="5,000" className="h-16 text-3xl font-bold text-center tabular-nums bg-slate-50/50 border-slate-200 rounded-2xl pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-500 text-sm">{lang === 'es' ? 'Descripción / Alcance' : 'Description / Scope'}</Label>
                  <button
                    type="button"
                    onClick={handleImproveDescription}
                    disabled={improvingDesc || !simpleDescription.trim()}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#008B99] hover:text-[#006d78] disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-lg hover:bg-[#008B99]/5"
                  >
                    {improvingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {improvingDesc
                      ? (lang === 'es' ? 'Mejorando...' : 'Improving...')
                      : (lang === 'es' ? 'Mejorar con IA' : 'Improve with AI')}
                  </button>
                </div>
                <Textarea value={simpleDescription} onChange={(e) => setSimpleDescription(e.target.value)} placeholder={lang === 'es' ? 'Retecho completo de 2,000 sqft...' : 'Full reroof of 2,000 sqft...'} className="min-h-[120px] text-base bg-slate-50/50 border-slate-200 rounded-xl resize-none" />
                {simpleDescription.trim().length > 0 && simpleDescription.trim().length < 20 && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Wand2 className="h-3 w-3" />
                    {lang === 'es' ? 'Escribí más y usá "Mejorar con IA" para completar' : 'Write more and use "Improve with AI" to enhance'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ITEMIZED MODE */}
        {mode === 'itemized' && (
          <>
            {renderSection('material', lang === 'es' ? 'Materiales' : 'Materials')}
            {renderSection('labor', lang === 'es' ? 'Mano de obra' : 'Labor')}
            {renderSection('other', lang === 'es' ? 'Otros' : 'Other')}
            <Card className="border-t-gradient border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] text-slate-400">{t('estimate.overheadPct')}</Label><Input type="number" min="0" max="100" value={overheadPct} onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)} className="h-10 bg-slate-50/50 border-slate-200 rounded-xl" /></div>
                  <div><Label className="text-[11px] text-slate-400">{t('estimate.marginPct')}</Label><Input type="number" min="0" max="100" value={marginPct} onChange={(e) => setMarginPct(parseFloat(e.target.value) || 0)} className="h-10 bg-slate-50/50 border-slate-200 rounded-xl" /></div>
                </div>
                <Separator className="bg-slate-100" />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">{t('estimate.subtotalMaterials')}</span><span className="tabular-nums">{formatMoney(calc.materials)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t('estimate.subtotalLabor')}</span><span className="tabular-nums">{formatMoney(calc.labor)}</span></div>
                  {calc.other > 0 && <div className="flex justify-between"><span className="text-slate-500">{t('estimate.subtotalOther')}</span><span className="tabular-nums">{formatMoney(calc.other)}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-500">{t('estimate.overhead')} ({overheadPct}%)</span><span className="tabular-nums">{formatMoney(calc.overhead)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t('estimate.margin')} ({marginPct}%)</span><span className="tabular-nums">{formatMoney(calc.margin)}</span></div>
                  <Separator className="bg-slate-100" />
                  <div className="flex justify-between text-lg font-bold pt-1"><span className="text-gradient-brand">{t('estimate.grandTotal')}</span><span className="text-gradient-brand tabular-nums">{formatMoney(calc.total)}</span></div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ACTIONS */}
        <div className="space-y-3">
          <button onClick={handleSave} disabled={saving} className="w-full h-12 text-base font-medium rounded-2xl btn-gradient flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? t('estimate.saving') : t('estimate.save')}
          </button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf} className="h-12 rounded-xl border-slate-200">{generatingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}PDF</Button>
            <Button variant="outline" onClick={() => setShowSendDialog(true)} className="h-12 rounded-xl border-slate-200 text-[#008B99]"><Send className="h-4 w-4 mr-1" />{lang === 'es' ? 'Enviar' : 'Send'}</Button>
            <Button variant="outline" onClick={handleAccepted} className="h-12 rounded-xl border-[#78BE20]/30 text-[#3D7A00]"><CheckCircle className="h-4 w-4 mr-1" />{lang === 'es' ? 'Aceptar' : 'Accept'}</Button>
          </div>
        </div>
      </div>

      {/* Send Dialog */}
      {showSendDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSendDialog(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{lang === 'es' ? 'Enviar presupuesto' : 'Send estimate'}</h3>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Email</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com" className="h-12 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/proposal/${job?.public_token}`} className="h-10 text-xs bg-slate-50 rounded-lg flex-1" />
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-10 rounded-lg px-3">{lang === 'es' ? 'Copiar' : 'Copy'}</Button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setShowSendDialog(false)}>{lang === 'es' ? 'Cancelar' : 'Cancel'}</Button>
              <button onClick={handleSendToClient} disabled={!clientEmail} className="flex-1 h-12 rounded-xl btn-gradient flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"><Send className="h-4 w-4" />{lang === 'es' ? 'Enviar' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  )
}
