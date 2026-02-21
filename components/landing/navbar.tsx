'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import t, { lt } from '@/lib/landing-translations'
import type { LandingLang } from '@/lib/landing-translations'

interface NavbarProps {
  lang: LandingLang
  onToggleLang: () => void
}

export function Navbar({ lang, onToggleLang }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-0.5 group">
          <span className="text-xl font-extrabold bg-gradient-to-r from-[#00B4D8] to-[#38B000] bg-clip-text text-transparent tracking-tight">
            ROOF
          </span>
          <span className={`text-xl font-extrabold tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-slate-900'}`}>
            BACK
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleLang}
            className="relative flex items-center h-8 bg-slate-100 rounded-full p-0.5 w-[72px] hover:bg-slate-200 transition-colors"
          >
            <motion.div
              className="absolute h-7 w-[34px] bg-white rounded-full shadow-sm"
              animate={{ x: lang === 'en' ? 1 : 35 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
            <span className={`relative z-10 flex-1 text-center text-xs font-semibold ${lang === 'en' ? 'text-slate-900' : 'text-slate-400'}`}>
              EN
            </span>
            <span className={`relative z-10 flex-1 text-center text-xs font-semibold ${lang === 'es' ? 'text-slate-900' : 'text-slate-400'}`}>
              ES
            </span>
          </button>

          <Link
            href="/login"
            className="hidden sm:inline-flex h-9 px-4 items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {lt(t.nav.login, lang)}
          </Link>

          <Link
            href="/login"
            className="h-9 px-5 rounded-full bg-slate-900 text-white text-sm font-semibold inline-flex items-center hover:bg-slate-800 transition-colors shadow-sm"
          >
            {lt(t.nav.cta, lang)}
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}
