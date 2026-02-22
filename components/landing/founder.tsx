'use client'

import { motion } from 'framer-motion'
import type { LandingLang } from '@/lib/landing-translations'

interface FounderProps {
  lang: LandingLang
}

export function Founder({ lang }: FounderProps) {
  const isEs = lang === 'es'

  return (
    <section className="bg-[#0F1117] py-24 relative overflow-hidden">
      {/* Subtle side accent */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-[#A8FF3E] rounded-r-full" />

      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Opening quote mark */}
          <div className="text-[120px] leading-none font-black text-[#A8FF3E]/10 absolute -top-8 -left-4 select-none pointer-events-none">
            &ldquo;
          </div>

          <div className="relative pl-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#A8FF3E]/30 bg-[#A8FF3E]/10 text-[#A8FF3E] text-xs font-semibold uppercase tracking-widest mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF3E]" />
              {isEs ? 'El origen de la bestia' : 'Where The Beast was born'}
            </div>

            <p className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-white leading-[1.4] mb-8">
              {isEs ? (
                <>
                  Llevo{' '}
                  <span className="text-[#A8FF3E]">20 años subiéndome a techos</span>{' '}
                  en Latinoamérica y USA. Probé todos los sistemas: algunos son muy complejos,
                  otros no te dicen nada.{' '}
                  <span className="text-[#A8FF3E]">Por eso creamos esto.</span>
                </>
              ) : (
                <>
                  I&apos;ve spent{' '}
                  <span className="text-[#A8FF3E]">20 years on rooftops</span>{' '}
                  across Latin America and the US. I tried every system out there: some are
                  too complex, others tell you nothing.{' '}
                  <span className="text-[#A8FF3E]">That&apos;s why we built this.</span>
                </>
              )}
            </p>

            <p className="text-lg text-[#9CA3AF] leading-relaxed max-w-2xl mb-10">
              {isEs
                ? 'No te endulzamos la oreja; te damos el control real de tus gastos y tu agenda. Sin filtros corporativos, sin pantallas que nadie entiende. Un techista que ya vivió tu caos lo construyó pensando en vos.'
                : 'We don\'t sugarcoat it — we give you real control over your costs and your schedule. No corporate filters, no screens nobody understands. A roofer who lived your chaos built this with you in mind.'}
            </p>

            {/* Stat callouts */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  value: '20+',
                  label: isEs ? 'Años en el techo' : 'Years on the roof',
                },
                {
                  value: '5 min',
                  label: isEs ? 'Para empezar a usarlo' : 'To get started',
                },
                {
                  value: '0',
                  label: isEs ? 'Pantallas inútiles' : 'Useless screens',
                },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 text-center"
                >
                  <p className="text-3xl font-black text-[#A8FF3E] tabular-nums">{stat.value}</p>
                  <p className="text-xs text-[#6B7280] mt-1 leading-tight">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
