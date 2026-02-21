'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import t, { lt } from '@/lib/landing-translations'
import type { LandingLang } from '@/lib/landing-translations'

interface HeroProps {
  lang: LandingLang
}

export function Hero({ lang }: HeroProps) {
  const [sloganIdx, setSloganIdx] = useState(0)
  const slogans = t.slogans

  useEffect(() => {
    const interval = setInterval(() => {
      setSloganIdx((prev) => (prev + 1) % slogans.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [slogans.length])

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#00B4D8]/5 to-[#38B000]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#38B000]/5 to-[#00B4D8]/5 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#38B000]" />
                {lang === 'es' ? 'Para techistas profesionales' : 'For professional roofers'}
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-slate-900 leading-[1.08] tracking-tight">
                {lt(t.hero.headline, lang)}
              </h1>

              <div className="h-10 flex items-center">
                <span className="text-xl font-bold bg-gradient-to-r from-[#00B4D8] to-[#38B000] bg-clip-text text-transparent tracking-tight mr-2">
                  ROOFBACK
                </span>
                <span className="text-xl text-slate-400 mr-1">&mdash;</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${sloganIdx}-${lang}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.4 }}
                    className="text-xl font-medium text-slate-500 italic"
                  >
                    {slogans[sloganIdx][lang]}
                  </motion.span>
                </AnimatePresence>
              </div>

              <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
                {lt(t.hero.sub, lang)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 h-14 px-8 rounded-full bg-slate-900 text-white text-base font-semibold shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/15 transition-all"
              >
                {lt(t.hero.cta, lang)}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <p className="text-sm text-slate-400 sm:self-center">{lt(t.hero.ctaSub, lang)}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-[280px] sm:w-[320px]">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#00B4D8]/10 to-[#38B000]/10 rounded-[40px] blur-2xl" />
              <div className="relative bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="h-8 bg-slate-50 flex items-center justify-center">
                  <div className="w-20 h-1 rounded-full bg-slate-200" />
                </div>

                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-extrabold bg-gradient-to-r from-[#00B4D8] to-[#38B000] bg-clip-text text-transparent">ROOF</span>
                    <span className="text-sm font-extrabold text-slate-900">BACK</span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">
                        {lang === 'es' ? 'PRESUPUESTO' : 'ESTIMATE'}
                      </div>
                      <div className="text-lg font-bold text-slate-900">$8,450.00</div>
                      <div className="text-xs text-slate-400 mt-0.5">J003-01</div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 p-2.5 bg-slate-50 rounded-lg text-center">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                          {lang === 'es' ? 'MATERIALES' : 'MATERIALS'}
                        </div>
                        <div className="text-sm font-semibold text-slate-800 mt-0.5">$3,200</div>
                      </div>
                      <div className="flex-1 p-2.5 bg-slate-50 rounded-lg text-center">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                          {lang === 'es' ? 'MANO DE OBRA' : 'LABOR'}
                        </div>
                        <div className="text-sm font-semibold text-slate-800 mt-0.5">$2,850</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                          {lang === 'es' ? 'ESTADO' : 'STATUS'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#38B000]" />
                          <span className="text-xs font-medium text-[#38B000]">
                            {lang === 'es' ? 'Aprobado' : 'Approved'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                      {lang === 'es' ? 'Descargar PDF' : 'Download PDF'}
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-6 bg-slate-50 flex items-center justify-center">
                  <div className="w-28 h-1 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
