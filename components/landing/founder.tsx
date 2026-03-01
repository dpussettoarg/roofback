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
              {isEs ? 'Por qué existe RoofBack' : 'Why RoofBack exists'}
            </div>

            <p className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-white leading-[1.4] mb-8">
              {isEs ? (
                <>
                  Llevo{' '}
                  <span className="text-[#A8FF3E]">30 años en obras de todo tipo</span>{' '}
                  en Latinoamérica y USA. Probé todos los sistemas: algunos son demasiado complejos,
                  otros no te dicen nada útil.{' '}
                  <span className="text-[#A8FF3E]">Por eso construimos una herramienta simple que realmente ayuda.</span>
                </>
              ) : (
                <>
                  I&apos;ve spent{' '}
                  <span className="text-[#A8FF3E]">30 years on job sites of every kind</span>{' '}
                  across Latin America and the US. I tried every system out there: some are
                  too complex, others tell you nothing useful.{' '}
                  <span className="text-[#A8FF3E]">So we built a simple tool that actually helps.</span>
                </>
              )}
            </p>

            <p className="text-lg text-[#9CA3AF] leading-relaxed max-w-2xl mb-10">
              {isEs
                ? 'RoofBack no es magia ni tecnología por la tecnología. Es orden, claridad y control — las mismas cosas que necesitás en una obra. Lo construimos porque lo necesitábamos, y no existía.'
                : 'RoofBack isn\'t magic or tech for tech\'s sake. It\'s order, clarity, and control — the same things you need on any job site. We built it because we needed it, and nothing like it existed.'}
            </p>

            {/* Stat callouts */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  value: '30+',
                  label: isEs ? 'Años en obras' : 'Years on job sites',
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
