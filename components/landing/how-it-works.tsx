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
    <section id="how-it-works" className="py-24 lg:py-32 bg-[#16191F]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-[#A8FF3E] uppercase tracking-wider mb-3">
            {lang === 'es' ? '3 pasos simples' : '3 simple steps'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {lt(t.steps.title, lang)}
          </h2>
          <p className="text-lg text-[#9CA3AF] mt-3 max-w-md mx-auto">
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
                <div className="bg-[#1E2228] rounded-2xl p-8 h-full border border-[#2A2D35] hover:border-[#A8FF3E]/30 hover:shadow-lg hover:shadow-[#A8FF3E]/5 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#A8FF3E]/10 border border-[#A8FF3E]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6 text-[#A8FF3E]" />
                    </div>
                    <span className="text-5xl font-black text-[#2A2D35] group-hover:text-[#A8FF3E]/20 transition-colors">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {lt(step.title, lang)}
                  </h3>
                  <p className="text-[#9CA3AF] leading-relaxed text-[15px]">
                    {lt(step.desc, lang)}
                  </p>
                </div>

                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-8 text-[#2A2D35]">
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
