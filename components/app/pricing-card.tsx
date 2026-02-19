'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createCheckoutSession } from '@/app/actions/stripe'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface PricingCardProps {
  priceId: string
  title: string
  price: string
  period?: string
  features: string[]
  highlighted?: boolean
  lang?: 'es' | 'en'
}

export function PricingCard({
  priceId,
  title,
  price,
  period = '/month',
  features,
  highlighted = false,
  lang = 'es',
}: PricingCardProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    try {
      const { url, error } = await createCheckoutSession(priceId)
      if (error) {
        throw new Error(error)
      }
      if (url) {
        window.location.href = url
        return
      }
      throw new Error(lang === 'es' ? 'No se pudo crear la sesión' : 'Could not create session')
    } catch (err) {
      console.error('Checkout error:', err)
      toast.error(err instanceof Error ? err.message : (lang === 'es' ? 'Error al procesar' : 'Checkout failed'))
      setLoading(false)
    }
  }

  return (
    <Card
      className={`border-0 shadow-sm rounded-2xl overflow-hidden transition-all ${
        highlighted
          ? 'ring-2 ring-[#008B99] bg-gradient-to-b from-[#008B99]/5 to-transparent'
          : 'bg-white'
      }`}
    >
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900">{price}</span>
            <span className="text-slate-500 text-sm">{period}</span>
          </div>
        </div>

        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="h-4 w-4 text-[#78BE20] shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <Button
          onClick={handleSubscribe}
          disabled={loading}
          className={`w-full h-12 rounded-xl font-medium ${
            highlighted ? 'btn-gradient' : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : lang === 'es' ? (
            'Suscribirse'
          ) : (
            'Subscribe'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
