'use client'

import { motion } from 'framer-motion'
import { ClipboardList, Sparkles, PenTool } from 'lucide-react'
import t, { lt } from '@/lib/landing-translations'
import type { LandingLang } from '@/lib/landing-translations'

interface HowItWorksProps {
  lang: LandingLang
}

const icons = [ClipboardList, Sparkles, PenTool]

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5 },
  }),
}

export function HowItWorks({ lang }: HowItWorksProps) {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-[#38B000] uppercase tracking-wider mb-3">
            {lang === 'es' ? '3 pasos simples' : '3 simple steps'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {lt(t.steps.title, lang)}
          </h2>
          <p className="text-lg text-slate-500 mt-3 max-w-md mx-auto">
            {lt(t.steps.sub, lang)}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {t.steps.items.map((step, i) => {
            const Icon = icons[i]
            return (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={cardVariants}
                className="relative group"
              >
                <div className="bg-slate-50 rounded-2xl p-8 h-full border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00B4D8]/10 to-[#38B000]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6 text-slate-700" />
                    </div>
                    <span className="text-5xl font-extrabold text-slate-100 group-hover:text-[#38B000]/15 transition-colors">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {lt(step.title, lang)}
                  </h3>
                  <p className="text-slate-500 leading-relaxed text-[15px]">
                    {lt(step.desc, lang)}
                  </p>
                </div>

                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-8 text-slate-200">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
