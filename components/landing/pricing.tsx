'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, ArrowRight, Zap } from 'lucide-react'
import t, { lt } from '@/lib/landing-translations'
import type { LandingLang } from '@/lib/landing-translations'

interface PricingProps {
  lang: LandingLang
}

export function Pricing({ lang }: PricingProps) {
  const [yearly, setYearly] = useState(false)

  const price = yearly ? 290 : 29
  const period = yearly ? lt(t.pricing.yearly, lang) : lt(t.pricing.monthly, lang)

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {lt(t.pricing.title, lang)}
          </h2>
          <p className="text-lg text-slate-500 mt-3 max-w-md mx-auto">
            {lt(t.pricing.sub, lang)}
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm font-medium transition-colors ${!yearly ? 'text-slate-900' : 'text-slate-400'}`}>
            {lt(t.pricing.toggle.monthly, lang)}
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className="relative w-14 h-8 bg-slate-200 rounded-full p-0.5 hover:bg-slate-300 transition-colors"
          >
            <motion.div
              className="w-7 h-7 bg-white rounded-full shadow-sm"
              animate={{ x: yearly ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${yearly ? 'text-slate-900' : 'text-slate-400'}`}>
            {lt(t.pricing.toggle.yearly, lang)}
          </span>
          {yearly && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-bold text-[#38B000] bg-[#38B000]/10 px-2.5 py-1 rounded-full"
            >
              {lt(t.pricing.toggle.save, lang)}
            </motion.span>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto"
        >
          <div className="relative bg-white rounded-3xl border-2 border-slate-900 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00B4D8] to-[#38B000]" />

            <div className="p-8 text-center border-b border-slate-100">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold mb-4">
                <Zap className="h-3 w-3" />
                {t.pricing.plan}
              </div>

              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-5xl font-extrabold text-slate-900 tabular-nums">
                  ${price}
                </span>
                <span className="text-lg text-slate-400 font-medium">{period}</span>
              </div>

              <p className="text-sm text-[#38B000] font-medium mt-3">
                {lt(t.pricing.trial, lang)}
              </p>
            </div>

            <div className="p-8 space-y-4">
              {t.pricing.features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#38B000]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-[#38B000]" strokeWidth={3} />
                  </div>
                  <span className="text-[15px] text-slate-700">{f[lang]}</span>
                </div>
              ))}
            </div>

            <div className="px-8 pb-8">
              <Link
                href="/login"
                className="group w-full h-14 rounded-2xl bg-slate-900 text-white text-base font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
              >
                {lt(t.pricing.cta, lang)}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
