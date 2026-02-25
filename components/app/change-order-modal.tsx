'use client'

import { useState } from 'react'
import { X, Smartphone, Mail, Link2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { ChangeOrder } from '@/lib/types'

const REASON_OPTIONS = [
  { value: 'hidden_damage', label_es: 'Daño oculto', label_en: 'Hidden damage' },
  { value: 'client_request', label_es: 'Pedido del cliente', label_en: 'Client request' },
  { value: 'code_requirement', label_es: 'Norma/código', label_en: 'Code requirement' },
  { value: 'weather', label_es: 'Clima', label_en: 'Weather' },
] as const

interface ChangeOrderModalProps {
  job: { id: string; client_name: string; client_phone: string; client_email: string; client_address: string }
  originalTotal: number
  companyName: string
  lang: string
  onClose: () => void
  onSaved: (co: ChangeOrder, notifySkipped: boolean) => void
}

export function ChangeOrderModal({ job, originalTotal, companyName, lang, onClose, onSaved }: ChangeOrderModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('hidden_damage')
  const [internalNote, setInternalNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [pendingChangeOrder, setPendingChangeOrder] = useState<ChangeOrder | null>(null)
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [messagePreview, setMessagePreview] = useState('')

  const amountNum = parseFloat(amount) || 0
  const newTotal = originalTotal + amountNum

  function buildMessage() {
    const addr = job.client_address || ''
    const desc = description || (lang === 'es' ? 'Cambio adicional' : 'Additional change')
    const amtStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.abs(amountNum))
    const totalStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(newTotal)
    if (lang === 'es') {
      return `Hola ${job.client_name}, encontramos un tema en tu trabajo en ${addr} que requiere trabajo adicional: ${desc}. Esto ${amountNum >= 0 ? 'suma' : 'resta'} ${amtStr} al total del proyecto, llevándolo a ${totalStr}. Por favor respondé para aprobar. — ${companyName || 'RoofBack'}`
    }
    return `Hi ${job.client_name}, we found an issue on your job at ${addr} that requires additional work: ${desc}. This ${amountNum >= 0 ? 'adds' : 'reduces'} ${amtStr} to your project total, bringing it to ${totalStr}. Please reply to approve. — ${companyName || 'RoofBack'}`
  }

  async function handleSave(notifySkipped: boolean) {
    if (!description.trim()) {
      toast.error(lang === 'es' ? 'Escribí la descripción' : 'Enter description')
      return
    }
    if (!amount || isNaN(parseFloat(amount))) {
      toast.error(lang === 'es' ? 'Ingresá el monto' : 'Enter amount')
      return
    }
    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('change_orders').insert({
        job_id: job.id,
        description: description.trim(),
        amount: amountNum,
        reason,
        internal_note: internalNote.trim() || undefined,
        status: notifySkipped ? 'verbal' : 'sent',
      }).select().single()
      if (error) throw error
      const co = data as ChangeOrder
      if (notifySkipped) {
        onSaved(co, true)
        onClose()
        toast.success(lang === 'es' ? 'Orden de cambio guardada (sin notificar)' : 'Change order saved (client not notified)')
      } else {
        setPendingChangeOrder(co)
        setMessagePreview(buildMessage())
        setShowNotifyModal(true)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  function handleSendAndClose() {
    if (pendingChangeOrder) {
      onSaved(pendingChangeOrder, false)
      onClose()
      toast.success(lang === 'es' ? 'Orden de cambio guardada' : 'Change order saved')
    }
    setShowNotifyModal(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[#1E2228] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto border border-[#2A2D35] shadow-xl">
          <div className="sticky top-0 bg-[#1E2228] border-b border-[#2A2D35] px-5 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{lang === 'es' ? 'Orden de Cambio' : 'Change Order'}</h2>
            <button onClick={onClose} className="p-2 text-[#6B7280] hover:text-white rounded-lg"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-1">{lang === 'es' ? '¿Qué cambió?' : 'What changed?'}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={lang === 'es' ? '4 chapas de deck podrido reemplazadas' : '4 sheets of rotted decking replaced'}
                className="w-full min-h-[80px] p-3 rounded-lg bg-[#0F1117] border border-[#2A2D35] text-white placeholder:text-[#6B7280] text-sm focus:outline-none focus:border-[#A8FF3E]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-1">{lang === 'es' ? 'Monto ($)' : 'Amount ($)'}</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="850" step="0.01"
                className="w-full h-12 px-3 rounded-lg bg-[#0F1117] border border-[#2A2D35] text-white text-sm focus:outline-none focus:border-[#A8FF3E]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-2">{lang === 'es' ? 'Motivo' : 'Reason'}</label>
              <div className="flex flex-wrap gap-2">
                {REASON_OPTIONS.map((r) => (
                  <button key={r.value} onClick={() => setReason(r.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${reason === r.value ? 'bg-[#A8FF3E] text-[#0F1117]' : 'bg-[#16191F] text-[#6B7280] border border-[#2A2D35]'}`}>
                    {lang === 'es' ? r.label_es : r.label_en}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-1">{lang === 'es' ? 'Nota interna (opcional, no se envía)' : 'Internal note (optional, not sent)'}</label>
              <input type="text" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder={lang === 'es' ? 'Solo para tu referencia' : 'For your reference only'}
                className="w-full h-10 px-3 rounded-lg bg-[#0F1117] border border-[#2A2D35] text-white text-sm focus:outline-none focus:border-[#A8FF3E]" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 h-12 rounded-lg border border-[#2A2D35] text-[#6B7280] text-sm font-medium hover:bg-[#252830]">
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={() => handleSave(false)} disabled={saving} className="flex-1 h-12 rounded-lg btn-lime text-sm font-semibold disabled:opacity-50">
                {lang === 'es' ? 'Guardar y notificar' : 'Save & notify'}
              </button>
            </div>
            <button onClick={() => setShowSkipWarning(true)} className="w-full text-xs text-[#6B7280] hover:text-amber-400 underline">
              {lang === 'es' ? 'Guardar sin notificar (no recomendado)' : 'Save without notifying (not recommended)'}
            </button>
          </div>
        </div>
      </div>

      {showSkipWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSkipWarning(false)} />
          <div className="relative bg-[#1E2228] rounded-xl p-6 max-w-sm border border-[#2A2D35] space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-semibold">
                {lang === 'es' ? 'Omitir la notificación puede causar disputas de pago. ¿Estás seguro?' : 'Skipping client notification can lead to payment disputes. Are you sure?'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSkipWarning(false)} className="flex-1 h-10 rounded-lg btn-lime text-sm font-medium">
                {lang === 'es' ? 'Volver y notificar' : 'Go back and notify'}
              </button>
              <button onClick={() => { setShowSkipWarning(false); handleSave(true) }} disabled={saving} className="flex-1 h-10 rounded-lg border border-amber-500/50 text-amber-400 text-sm font-medium hover:bg-amber-500/10">
                {lang === 'es' ? 'Guardar igual' : 'Skip anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotifyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-[#1E2228] rounded-xl p-6 max-w-md w-full border border-[#2A2D35] space-y-4">
            <h3 className="text-base font-bold text-white">{lang === 'es' ? 'Notificar a tu cliente' : 'Notify your client'}</h3>
            <p className="text-sm text-[#6B7280]">
              {lang === 'es' ? 'Una orden de cambio debe comunicarse al cliente.' : 'A change order must be communicated to your client.'}
            </p>
            <p className="text-xs text-[#6B7280]">{lang === 'es' ? 'Enviar notificación por:' : 'Send notification via:'}</p>
            <div className="flex gap-2">
              <button onClick={() => { const phone = job.client_phone?.replace(/\D/g, ''); if (phone) window.open(`sms:${phone}?body=${encodeURIComponent(messagePreview)}`, '_blank'); handleSendAndClose() }}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-[#2A2D35] hover:bg-[#252830] text-white text-sm">
                <Smartphone className="h-4 w-4 text-[#A8FF3E]" /> SMS
              </button>
              <button onClick={() => { window.open(`mailto:${job.client_email}?subject=${encodeURIComponent('Change Order')}&body=${encodeURIComponent(messagePreview)}`, '_blank'); handleSendAndClose() }}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-[#2A2D35] hover:bg-[#252830] text-white text-sm">
                <Mail className="h-4 w-4 text-[#A8FF3E]" /> Email
              </button>
              <button onClick={() => { navigator.clipboard.writeText(messagePreview); toast.success(lang === 'es' ? 'Link/mensaje copiado' : 'Message copied'); handleSendAndClose() }}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-[#2A2D35] hover:bg-[#252830] text-white text-sm">
                <Link2 className="h-4 w-4 text-[#A8FF3E]" /> {lang === 'es' ? 'Copiar' : 'Copy'}
              </button>
            </div>
            <div className="text-xs text-[#9CA3AF] bg-[#0F1117] rounded-lg p-3 max-h-24 overflow-y-auto">
              {messagePreview}
            </div>
            <button onClick={handleSendAndClose} className="w-full h-11 rounded-lg btn-lime font-semibold text-sm">
              {lang === 'es' ? 'Enviar y guardar' : 'Send & Save'}
            </button>
            <button onClick={() => setShowSkipWarning(true)} className="w-full text-xs text-amber-400/80 hover:text-amber-400 underline">
              {lang === 'es' ? 'Guardar sin notificar' : 'Save without notifying'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
