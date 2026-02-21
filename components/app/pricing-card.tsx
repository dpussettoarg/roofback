'use client'

import { useState } from 'react'
import { createCheckoutSession } from '@/app/actions/stripe'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface PricingCardProps {
  priceId?: string
  title: string
  price: string
  period?: string
  features: string[]
  highlighted?: boolean
  lang?: 'es' | 'en'
  buttonLabel?: 'upgrade' | 'subscribe'
}

export function PricingCard({
  priceId = 'price_1T2ODTBiIxuQmwGuua83OmC0',
  title,
  price,
  period = '/month',
  features,
  highlighted = false,
  lang = 'es',
  buttonLabel = 'subscribe',
}: PricingCardProps) {
  const [loading, setLoading] = useState(false)

  const buttonText =
    buttonLabel === 'upgrade'
      ? lang === 'es'
        ? 'Actualizar a Pro'
        : 'Upgrade to Pro'
      : lang === 'es'
        ? 'Suscribirse'
        : 'Subscribe'

  async function handleSubscribe() {
    setLoading(true)
    try {
      const { url, error } = await createCheckoutSession(priceId)
      if (error) {
        toast.error(error)
        return
      }
      if (url) {
        window.location.href = url
        return
      }
      toast.error(lang === 'es' ? 'No se pudo crear la sesión' : 'Could not create session')
    } catch (err) {
      console.error('Checkout error:', err)
      toast.error(err instanceof Error ? err.message : (lang === 'es' ? 'Error al procesar' : 'Checkout failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all ${
        highlighted
          ? 'ring-2 ring-[#A8FF3E]/40 bg-gradient-to-b from-[#A8FF3E]/5 to-transparent'
          : ''
      }`}
      style={{ backgroundColor: '#16191F', border: '1px solid #2A2D35' }}
    >
      <div className="p-5 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">{price}</span>
            <span className="text-[#6B7280] text-sm">{period}</span>
          </div>
        </div>

        <ul className="space-y-2.5">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm text-[#9CA3AF]">
              <Check className="h-4 w-4 text-[#A8FF3E] shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn-lime w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {lang === 'es' ? 'Redirigiendo...' : 'Redirecting...'}
            </>
          ) : (
            buttonText
          )}
        </button>
      </div>
    </div>
  )
}
