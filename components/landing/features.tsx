'use client'

import { motion } from 'framer-motion'
import {
  BrainCircuit, DollarSign, CalendarCheck,
  FileText, Users, Smartphone,
} from 'lucide-react'
import type { LandingLang } from '@/lib/landing-translations'

interface FeaturesProps {
  lang: LandingLang
}

const FEATURES = [
  {
    icon: BrainCircuit,
    color: '#A8FF3E',
    title: { es: 'Daily Briefing con IA', en: 'AI Daily Briefing' },
    body: {
      es: 'Recibí un reporte breve cada mañana. Lo más importante de tu agenda y tus gastos sin mover un dedo. Tres consejos accionables del Asesor IA, generados con tus datos reales.',
      en: 'Get a short report every morning. The most important items from your schedule and costs — no effort required. Three actionable tips from the AI Advisor, generated from your real data.',
    },
  },
  {
    icon: DollarSign,
    color: '#A8FF3E',
    title: { es: 'Control de Gastos en Tiempo Real', en: 'Real-Time Cost Control' },
    body: {
      es: 'Manejá el presupuesto de cada trabajo y controlá los gastos de cada proyecto en tiempo real. Materiales, mano de obra y gastos varios contra lo presupuestado — en una pantalla.',
      en: 'Manage every job\'s budget and track actual spend in real time. Materials, labor, and other costs versus what was estimated — on one screen.',
    },
  },
  {
    icon: CalendarCheck,
    color: '#FBBF24',
    title: { es: 'Cronograma Visual de 4 Hitos', en: '4-Milestone Visual Timeline' },
    body: {
      es: 'Línea de tiempo basada en la realidad de la obra: Contrato → Materiales → Obra → Finalizado. Notificá al cliente de cada avance desde la misma pantalla.',
      en: 'A timeline built on real job reality: Contract → Materials → On-Site → Done. Notify the client of each milestone directly from the same screen.',
    },
  },
  {
    icon: FileText,
    color: '#60A5FA',
    title: { es: 'Presupuestos Profesionales en Segundos', en: 'Professional Estimates in Seconds' },
    body: {
      es: 'La IA genera una propuesta detallada en inglés o español. El cliente firma digitalmente desde el celular. Tus presupuestos quedan inmutables como contrato legal.',
      en: 'AI generates a detailed proposal in English or Spanish. The client signs digitally from their phone. Your estimates are locked in as a legal contract.',
    },
  },
  {
    icon: Users,
    color: '#C084FC',
    title: { es: 'Equipo Centralizado', en: 'Centralized Team' },
    body: {
      es: 'Invitá operarios y coordinadores. Cada rol ve lo que necesita — sin datos financieros sensibles expuestos. Un solo lugar para toda la organización.',
      en: 'Invite crew and coordinators. Each role sees exactly what they need — no sensitive financial data exposed. One place for the whole organization.',
    },
  },
  {
    icon: Smartphone,
    color: '#A8FF3E',
    title: { es: 'Diseñado para el Celular', en: 'Mobile-First, Always' },
    body: {
      es: 'Funciona en tu teléfono en pleno sol, con guantes o en la camioneta. Tomá fotos, cargá horas y cerrá trabajos desde el campo.',
      en: 'Works on your phone in full sun, with gloves on, or in the truck. Take photos, log hours, and close jobs from the field.',
    },
  },
]

export function Features({ lang }: FeaturesProps) {
  const isEs = lang === 'es'

  return (
    <section className="bg-[#0F1117] py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(168,255,62,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,255,62,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="max-w-6xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#A8FF3E]/30 bg-[#A8FF3E]/10 text-[#A8FF3E] text-xs font-semibold uppercase tracking-widest mb-5">
            {isEs ? 'Herramientas de la Bestia' : 'The Beast\'s Arsenal'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isEs
              ? 'Todo lo que necesitás. Nada que no necesitás.'
              : 'Everything you need. Nothing you don\'t.'}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                className="group bg-[#1E2228] border border-[#2A2D35] rounded-xl p-6 hover:border-[#3A3D45] hover:bg-[#22262E] transition-all duration-300 cursor-default"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300"
                  style={{ backgroundColor: `${feat.color}15`, border: `1px solid ${feat.color}30` }}
                >
                  <Icon className="h-5 w-5" style={{ color: feat.color }} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {isEs ? feat.title.es : feat.title.en}
                </h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">
                  {isEs ? feat.body.es : feat.body.en}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
