'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp, DollarSign, CheckCircle } from 'lucide-react'
import type { LandingLang } from '@/lib/landing-translations'

interface HeroProps {
  lang: LandingLang
}

const JOBS = [
  { client: 'Rivera Roofing', value: '$14,200', burn: 62, stage: 'En Obra', stageEn: 'On-Site', color: '#A8FF3E' },
  { client: 'Sunset Metal Co.', value: '$8,950', burn: 88, stage: 'Materiales', stageEn: 'Materials', color: '#FBBF24' },
  { client: 'A&M Contractors', value: '$22,000', burn: 31, stage: 'Contrato', stageEn: 'Contract', color: '#A8FF3E' },
]

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex-1">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

export function Hero({ lang }: HeroProps) {
  const isEs = lang === 'es'

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0F1117]">
      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(168,255,62,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,255,62,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #A8FF3E 0%, transparent 70%)' }}
      />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Copy ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#A8FF3E]/30 bg-[#A8FF3E]/10 text-[#A8FF3E] text-xs font-semibold uppercase tracking-widest"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF3E] animate-pulse" />
              {isEs ? 'Hecho por techistas, para techistas' : 'Built by roofers, for roofers'}
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-white leading-[1.06] tracking-tight">
              {isEs ? (
                <>
                  No te dejamos ahogar<br />
                  en la organización.<br />
                  <span className="text-[#A8FF3E]">Controlá tu negocio</span>{' '}
                  con la experiencia de{' '}
                  <span className="text-[#A8FF3E]">20 años</span> en el techo.
                </>
              ) : (
                <>
                  We won&apos;t let you drown<br />
                  in the paperwork.<br />
                  <span className="text-[#A8FF3E]">Take control</span>{' '}
                  with{' '}
                  <span className="text-[#A8FF3E]">20 years</span> of roofing experience.
                </>
              )}
            </h1>

            <p className="text-lg text-[#9CA3AF] leading-relaxed max-w-lg">
              {isEs
                ? 'Desarrollamos la herramienta que nosotros mismos necesitábamos. Sin vueltas, sin datos innecesarios. Solo lo que necesitás para que el trabajo rinda y el equipo funcione.'
                : 'We built the tool we always needed ourselves. No fluff, no bloat. Just what you need to run the job right and keep your crew moving.'}
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2.5 h-14 px-8 rounded-full bg-[#A8FF3E] text-[#0F1117] text-base font-black shadow-lg shadow-[#A8FF3E]/20 hover:bg-[#bfff6b] hover:shadow-[#A8FF3E]/30 transition-all"
              >
                {isEs ? 'Probá la Bestia — 14 días gratis' : 'Try The Beast — 14 days free'}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <p className="text-sm text-[#6B7280] sm:self-center">
                {isEs ? 'Sin tarjeta de crédito' : 'No credit card required'}
              </p>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 pt-2">
              {[
                { icon: CheckCircle, text: isEs ? 'Lista en 5 minutos' : 'Up in 5 minutes' },
                { icon: DollarSign, text: isEs ? 'Control total de costos' : 'Full cost control' },
                { icon: TrendingUp, text: isEs ? 'AI Advisor incluido' : 'AI Advisor included' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-[#A8FF3E]" />
                  <span className="text-xs text-[#6B7280] font-medium">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: Dashboard Preview ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[360px]">
              {/* Glow behind card */}
              <div className="absolute -inset-6 rounded-[40px] opacity-30 blur-3xl"
                style={{ background: 'radial-gradient(ellipse, #A8FF3E 0%, transparent 70%)' }} />

              {/* Phone shell */}
              <div className="relative bg-[#1E2228] border border-[#2A2D35] rounded-[28px] overflow-hidden shadow-2xl">
                {/* Status bar */}
                <div className="h-8 bg-[#16191F] flex items-center justify-center">
                  <div className="w-20 h-1 rounded-full bg-[#2A2D35]" />
                </div>

                <div className="px-5 pt-4 pb-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold">
                        {isEs ? 'Asesor IA' : 'AI Advisor'}
                      </p>
                      <p className="text-base font-black text-white mt-0.5">
                        {isEs ? 'Rivera Techos' : 'Rivera Roofing'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#A8FF3E]/20 flex items-center justify-center border border-[#A8FF3E]/30">
                      <span className="text-base">🧠</span>
                    </div>
                  </div>

                  {/* AI Insight Card */}
                  <div className="bg-[#0d1f0a] border border-[#A8FF3E]/20 rounded-xl p-3.5">
                    <p className="text-[9px] text-[#A8FF3E] uppercase tracking-widest font-bold mb-1.5">
                      {isEs ? '✅ Acción de hoy' : '✅ Today\'s Action'}
                    </p>
                    <p className="text-xs text-[#D1D5DB] leading-relaxed">
                      {isEs
                        ? 'Sunset Metal Co. ya consumió el 88% del presupuesto. Revisá los costos de mano de obra antes del turno de mañana.'
                        : 'Sunset Metal Co. is at 88% budget burn. Review labor costs before tomorrow\'s shift.'}
                    </p>
                  </div>

                  {/* Job rows with dual bars */}
                  <div className="space-y-3">
                    {JOBS.map((job, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.15 }}
                        className="bg-[#16191F] rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs font-bold text-white">{job.client}</p>
                            <p className="text-[10px] text-[#6B7280]">{isEs ? job.stage : job.stageEn}</p>
                          </div>
                          <span className="text-xs font-bold text-white tabular-nums">{job.value}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MiniBar pct={job.burn} color={job.color} />
                          <span className="text-[10px] font-bold tabular-nums" style={{ color: job.color }}>
                            {job.burn}%
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Bottom CTA */}
                  <motion.div
                    className="relative h-11 rounded-xl flex items-center justify-center text-[#0F1117] text-sm font-black overflow-hidden"
                    style={{ backgroundColor: '#A8FF3E' }}
                    animate={{ opacity: [1, 0.85, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  >
                    {isEs ? 'Descargar Reporte del Día' : 'Download Daily Report'}
                  </motion.div>
                </div>

                {/* Bottom bar */}
                <div className="h-6 bg-[#16191F] flex items-center justify-center">
                  <div className="w-28 h-1 rounded-full bg-[#2A2D35]" />
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
