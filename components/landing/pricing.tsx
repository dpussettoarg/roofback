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
    <section id="pricing" className="py-24 lg:py-32 bg-[#0F1117] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(168,255,62,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,255,62,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="max-w-6xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#A8FF3E]/30 bg-[#A8FF3E]/10 text-[#A8FF3E] text-xs font-semibold uppercase tracking-widest mb-5">
            {lang === 'es' ? 'Simple y transparente' : 'Simple & transparent'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {lt(t.pricing.title, lang)}
          </h2>
          <p className="text-lg text-[#9CA3AF] mt-3 max-w-md mx-auto">
            {lt(t.pricing.sub, lang)}
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm font-medium transition-colors ${!yearly ? 'text-white' : 'text-[#6B7280]'}`}>
            {lt(t.pricing.toggle.monthly, lang)}
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className="relative w-14 h-8 bg-[#1E2228] border border-[#2A2D35] rounded-full p-0.5 hover:border-[#3A3D45] transition-colors"
          >
            <motion.div
              className="w-7 h-7 bg-[#A8FF3E] rounded-full"
              animate={{ x: yearly ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${yearly ? 'text-white' : 'text-[#6B7280]'}`}>
            {lt(t.pricing.toggle.yearly, lang)}
          </span>
          {yearly && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-bold text-[#A8FF3E] bg-[#A8FF3E]/10 px-2.5 py-1 rounded-full border border-[#A8FF3E]/30"
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
          <div className="relative bg-[#1E2228] rounded-3xl border-2 border-[#A8FF3E] shadow-xl shadow-[#A8FF3E]/10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#A8FF3E]" />

            <div className="p-8 text-center border-b border-[#2A2D35]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A8FF3E]/10 border border-[#A8FF3E]/30 text-[#A8FF3E] text-xs font-black mb-4">
                <Zap className="h-3 w-3" />
                🦁 {t.pricing.plan}
              </div>

              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-5xl font-black text-white tabular-nums">
                  ${price}
                </span>
                <span className="text-lg text-[#6B7280] font-medium">{period}</span>
              </div>

              <p className="text-sm text-[#A8FF3E] font-semibold mt-3">
                {lt(t.pricing.trial, lang)}
              </p>
            </div>

            <div className="p-8 space-y-4">
              {t.pricing.features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-[#A8FF3E]" strokeWidth={3} />
                  </div>
                  <span className="text-[15px] text-[#D1D5DB]">{f[lang]}</span>
                </div>
              ))}
            </div>

            <div className="px-8 pb-8">
              <Link
                href="/login"
                className="group w-full h-14 rounded-2xl bg-[#A8FF3E] text-[#0F1117] text-base font-black flex items-center justify-center gap-2 hover:bg-[#bfff6b] transition-colors shadow-lg shadow-[#A8FF3E]/20"
              >
                {lang === 'es' ? 'Probá la Bestia — 14 días gratis' : 'Try The Beast — 14 days free'}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <p className="text-center text-xs text-[#6B7280] mt-3">
                {lang === 'es' ? 'Sin tarjeta de crédito' : 'No credit card required'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
