'use client'

import { motion } from 'framer-motion'
import { X, Minus, Check } from 'lucide-react'
import type { LandingLang } from '@/lib/landing-translations'

interface ComparisonProps {
  lang: LandingLang
}

const ROWS = [
  {
    feature: { es: 'Setup inicial', en: 'Initial Setup' },
    corporate: { es: 'Meses de entrenamiento', en: 'Months of training' },
    spreadsheet: { es: 'Caos constante', en: 'Constant chaos' },
    beast: { es: 'Listo en 5 minutos', en: 'Up in 5 minutes' },
  },
  {
    feature: { es: 'Enfoque', en: 'Focus' },
    corporate: { es: 'Administrativo', en: 'Administrative' },
    spreadsheet: { es: 'Memoria del techista', en: 'Roofer\'s memory' },
    beast: { es: 'Operativo y realista', en: 'Operational & real' },
  },
  {
    feature: { es: 'Insights', en: 'Insights' },
    corporate: { es: 'Gráficos lindos pero vacíos', en: 'Pretty but empty charts' },
    spreadsheet: { es: 'Ninguno', en: 'None' },
    beast: { es: 'Consejos de un veterano (AI Advisor)', en: 'Veteran advice (AI Advisor)' },
  },
  {
    feature: { es: 'Control de equipo', en: 'Team control' },
    corporate: { es: 'Licencias caras por usuario', en: 'Expensive per-user licenses' },
    spreadsheet: { es: 'Gritos por teléfono', en: 'Phone call chaos' },
    beast: { es: 'Organización centralizada', en: 'Centralized & simple' },
  },
  {
    feature: { es: 'Presupuestos', en: 'Estimates' },
    corporate: { es: 'Formularios interminables', en: 'Endless forms' },
    spreadsheet: { es: 'Cálculos manuales', en: 'Manual math' },
    beast: { es: 'IA en segundos + firma digital', en: 'AI in seconds + e-signature' },
  },
  {
    feature: { es: 'Cronograma de obra', en: 'Job schedule' },
    corporate: { es: 'Módulo separado (extra $)', en: 'Separate module (extra $)' },
    spreadsheet: { es: 'Papel o nada', en: 'Paper or nothing' },
    beast: { es: 'Timeline de 4 hitos visual', en: '4-milestone visual tracker' },
  },
]

function StatusIcon({ type }: { type: 'bad' | 'neutral' | 'good' }) {
  if (type === 'bad') return <X className="h-4 w-4 text-red-400 flex-shrink-0" />
  if (type === 'neutral') return <Minus className="h-4 w-4 text-[#6B7280] flex-shrink-0" />
  return <Check className="h-4 w-4 text-[#A8FF3E] flex-shrink-0" strokeWidth={3} />
}

export function Comparison({ lang }: ComparisonProps) {
  const isEs = lang === 'es'

  return (
    <section className="bg-[#16191F] py-24 relative overflow-hidden">
      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'linear-gradient(rgba(168,255,62,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,255,62,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="max-w-5xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#A8FF3E]/30 bg-[#A8FF3E]/10 text-[#A8FF3E] text-xs font-semibold uppercase tracking-widest mb-5">
            {isEs ? '🦁 La Bestia vs. El Resto' : '🦁 The Beast vs. The Rest'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isEs
              ? 'Sabemos con qué estás compitiendo. Ganamos en todo.'
              : 'We know what you\'ve tried. We win on everything.'}
          </h2>
          <p className="text-[#9CA3AF] mt-3 max-w-lg mx-auto">
            {isEs
              ? 'Comparación honesta. Sin marketing corporativo.'
              : 'Honest comparison. No corporate spin.'}
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                {/* Feature column */}
                <th className="pb-4 text-left w-[22%]">
                  <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">
                    {isEs ? 'Área' : 'Area'}
                  </span>
                </th>
                {/* Corporate */}
                <th className="pb-4 text-center w-[26%]">
                  <div className="inline-block bg-[#1E2228] border border-[#2A2D35] rounded-xl px-4 py-2.5">
                    <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block">
                      {isEs ? 'Software Corporativo' : 'Corporate Software'}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">
                      {isEs ? 'Odoo, Buildertrend...' : 'Odoo, Buildertrend...'}
                    </span>
                  </div>
                </th>
                {/* Spreadsheet */}
                <th className="pb-4 text-center w-[26%]">
                  <div className="inline-block bg-[#1E2228] border border-[#2A2D35] rounded-xl px-4 py-2.5">
                    <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block">
                      {isEs ? 'Hojas de Cálculo' : 'Spreadsheets / Paper'}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">Excel, Google Sheets...</span>
                  </div>
                </th>
                {/* Beast */}
                <th className="pb-4 text-center w-[26%]">
                  <div className="inline-block bg-[#A8FF3E]/10 border-2 border-[#A8FF3E] rounded-xl px-4 py-2.5 relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#A8FF3E] text-[#0F1117] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">
                      {isEs ? '🦁 La Bestia' : '🦁 The Beast'}
                    </span>
                    <span className="text-xs font-black text-[#A8FF3E] uppercase tracking-wider block mt-1">
                      RoofBack
                    </span>
                    <span className="text-[10px] text-[#A8FF3E]/60">
                      {isEs ? 'Hecho por techistas' : 'Built by roofers'}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className={`border-t ${i === 0 ? 'border-[#2A2D35]' : 'border-[#2A2D35]/60'}`}
                >
                  {/* Feature */}
                  <td className="py-4 pr-4">
                    <span className="text-sm font-semibold text-[#D1D5DB]">
                      {isEs ? row.feature.es : row.feature.en}
                    </span>
                  </td>
                  {/* Corporate */}
                  <td className="py-4 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <StatusIcon type="bad" />
                      <span className="text-xs text-[#9CA3AF]">
                        {isEs ? row.corporate.es : row.corporate.en}
                      </span>
                    </div>
                  </td>
                  {/* Spreadsheet */}
                  <td className="py-4 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <StatusIcon type="neutral" />
                      <span className="text-xs text-[#9CA3AF]">
                        {isEs ? row.spreadsheet.es : row.spreadsheet.en}
                      </span>
                    </div>
                  </td>
                  {/* Beast — highlighted */}
                  <td className="py-4 px-3 text-center bg-[#A8FF3E]/5 rounded-lg">
                    <div className="flex items-center justify-center gap-2">
                      <StatusIcon type="good" />
                      <span className="text-xs font-semibold text-white">
                        {isEs ? row.beast.es : row.beast.en}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  )
}
