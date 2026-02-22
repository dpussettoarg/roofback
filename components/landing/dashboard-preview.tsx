'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import type { LandingLang } from '@/lib/landing-translations'

interface DashboardPreviewProps {
  lang: LandingLang
}

// Static mock data for the preview
const MOCK_JOBS = [
  {
    client: 'Rivera Roofing',
    contract: 14200,
    actual: 6100,
    budget: 9800,
    stage: { es: 'En Obra', en: 'On-Site' },
  },
  {
    client: 'Sunset Metal Co.',
    contract: 8950,
    actual: 8100,
    budget: 7200,
    stage: { es: 'Materiales', en: 'Materials' },
  },
  {
    client: 'A&M Contractors',
    contract: 22000,
    actual: 3800,
    budget: 15400,
    stage: { es: 'Contrato', en: 'Contract' },
  },
]

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function TrafficLight({ pct }: { pct: number }) {
  if (pct > 100) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
        <TrendingDown className="h-3 w-3 text-red-400" />
        <span className="text-xs font-bold text-red-400">{pct.toFixed(0)}%</span>
        <AlertTriangle className="h-3 w-3 text-red-400" />
      </div>
    )
  }
  if (pct > 80) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30">
        <TrendingUp className="h-3 w-3 text-yellow-400" />
        <span className="text-xs font-bold text-yellow-400">{pct.toFixed(0)}%</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A8FF3E]/15 border border-[#A8FF3E]/30">
      <TrendingUp className="h-3 w-3 text-[#A8FF3E]" />
      <span className="text-xs font-bold text-[#A8FF3E]">{pct.toFixed(0)}%</span>
    </div>
  )
}

function BudgetBar({ actual, budget }: { actual: number; budget: number }) {
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0
  const overBudget = actual > budget
  const color = overBudget ? '#F87171' : pct > 80 ? '#FBBF24' : '#A8FF3E'
  return (
    <div className="h-1.5 rounded-full bg-[#0F1117] overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

export function DashboardPreview({ lang }: DashboardPreviewProps) {
  const isEs = lang === 'es'

  const totalContract = MOCK_JOBS.reduce((s, j) => s + j.contract, 0)
  const totalActual = MOCK_JOBS.reduce((s, j) => s + j.actual, 0)
  const totalBudget = MOCK_JOBS.reduce((s, j) => s + j.budget, 0)
  const orgBurn = (totalActual / totalBudget) * 100

  return (
    <section className="bg-[#16191F] py-24 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#A8FF3E]/30 bg-[#A8FF3E]/10 text-[#A8FF3E] text-xs font-semibold uppercase tracking-widest mb-5">
            {isEs ? 'Vista del Dueño' : 'Owner\'s View'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isEs
              ? 'Sabés dónde se va el dinero. Siempre.'
              : 'You always know where the money goes.'}
          </h2>
          <p className="text-[#9CA3AF] mt-3 max-w-lg mx-auto">
            {isEs
              ? 'El semáforo de Ganancia vs. Real te dice en segundos si estás a punto de perder dinero en un trabajo.'
              : 'The Profit vs. Actual traffic light tells you in seconds if you\'re about to lose money on a job.'}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* ── Left: Text explanation ── */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {[
              {
                dot: '#A8FF3E',
                label: isEs ? '🟢 Verde — En control' : '🟢 Green — Under control',
                desc: isEs
                  ? 'El gasto real está por debajo del 80% del presupuesto. El trabajo va bien, margen intacto.'
                  : 'Actual spend is below 80% of budget. Job is on track, margin intact.',
              },
              {
                dot: '#FBBF24',
                label: isEs ? '🟡 Amarillo — Atención' : '🟡 Yellow — Watch it',
                desc: isEs
                  ? 'Ya consumiste más del 80% del presupuesto. Revisá materiales y horas antes de que se pase.'
                  : 'You\'ve burned over 80% of the budget. Review materials and hours before it goes over.',
              },
              {
                dot: '#F87171',
                label: isEs ? '🔴 Rojo — Alerta de pérdida' : '🔴 Red — Loss alert',
                desc: isEs
                  ? 'El gasto real superó el presupuesto. Necesitás actuar hoy o este trabajo come tu ganancia.'
                  : 'Actual spend has exceeded budget. You need to act today or this job eats your profit.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="flex gap-4"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: item.dot, boxShadow: `0 0 8px ${item.dot}60` }} />
                <div>
                  <p className="text-sm font-bold text-white mb-1">{item.label}</p>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}

            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-5 mt-6">
              <p className="text-xs text-[#A8FF3E] font-bold uppercase tracking-widest mb-2">
                {isEs ? 'Org-wide Burn Rate' : 'Org-wide Burn Rate'}
              </p>
              <div className="flex items-end gap-3 mb-3">
                <span className={`text-4xl font-black tabular-nums ${orgBurn > 80 ? 'text-yellow-400' : 'text-white'}`}>
                  {orgBurn.toFixed(0)}%
                </span>
                <span className="text-sm text-[#6B7280] mb-1">
                  {formatMoney(totalActual)} / {formatMoney(totalBudget)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#0F1117] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#FBBF24]"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.min(orgBurn, 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-[#6B7280] mt-2">
                {isEs
                  ? `${formatMoney(totalContract)} en contratos activos`
                  : `${formatMoney(totalContract)} in active contracts`}
              </p>
            </div>
          </motion.div>

          {/* ── Right: Mock Dashboard card ── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="px-5 py-4 border-b border-[#2A2D35] flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-widest font-semibold">
                    {isEs ? 'Proyectos Activos — Vista del Dueño' : 'Active Projects — Owner View'}
                  </p>
                </div>
                <span className="text-[10px] text-[#6B7280] bg-[#16191F] px-2 py-1 rounded-full">Live</span>
              </div>

              {/* Job rows */}
              <div className="divide-y divide-[#2A2D35]/50">
                {MOCK_JOBS.map((job, i) => {
                  const pct = (job.actual / job.budget) * 100
                  const profit = job.contract - job.budget
                  const profitPct = (profit / job.contract) * 100

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12, duration: 0.4 }}
                      className="px-5 py-4"
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div>
                          <p className="text-sm font-bold text-white">{job.client}</p>
                          <p className="text-xs text-[#6B7280]">{isEs ? job.stage.es : job.stage.en}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrafficLight pct={pct} />
                        </div>
                      </div>

                      {/* Money row */}
                      <div className="grid grid-cols-3 gap-2 mb-2.5 text-center">
                        <div>
                          <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">
                            {isEs ? 'Contrato' : 'Contract'}
                          </p>
                          <p className="text-xs font-bold text-white tabular-nums">{formatMoney(job.contract)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">
                            {isEs ? 'Gasto Real' : 'Actual'}
                          </p>
                          <p className={`text-xs font-bold tabular-nums ${job.actual > job.budget ? 'text-red-400' : 'text-white'}`}>
                            {formatMoney(job.actual)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">
                            {isEs ? 'Margen' : 'Margin'}
                          </p>
                          <p className="text-xs font-bold text-[#A8FF3E] tabular-nums">{profitPct.toFixed(0)}%</p>
                        </div>
                      </div>

                      {/* Budget bar */}
                      <BudgetBar actual={job.actual} budget={job.budget} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-[#6B7280]">
                          {isEs ? 'Presupuesto:' : 'Budget:'} {formatMoney(job.budget)}
                        </span>
                        <span className="text-[9px] text-[#6B7280] tabular-nums">
                          {pct.toFixed(0)}% {isEs ? 'consumido' : 'consumed'}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
