'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import t, { lt } from '@/lib/landing-translations'
import type { LandingLang } from '@/lib/landing-translations'

interface BenefitsProps {
  lang: LandingLang
}

export function Benefits({ lang }: BenefitsProps) {
  return (
    <section className="py-24 lg:py-32 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {lt(t.benefits.title, lang)}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.benefits.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-start gap-3.5 p-5 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-300"
            >
              <div className="w-6 h-6 rounded-full bg-[#38B000]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-[#38B000]" strokeWidth={3} />
              </div>
              <p className="text-[15px] text-slate-700 leading-relaxed font-medium">
                {item[lang]}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
