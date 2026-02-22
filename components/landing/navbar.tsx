'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
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
          ? 'bg-[#0F1117]/95 backdrop-blur-xl border-b border-[#2A2D35]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-0.5 group">
          <span className="text-xl font-black text-[#A8FF3E] tracking-tight">ROOF</span>
          <span className="text-xl font-black text-white tracking-tight">BACK</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Lang toggle */}
          <button
            onClick={onToggleLang}
            className="relative flex items-center h-8 bg-[#1E2228] border border-[#2A2D35] rounded-full p-0.5 w-[72px] hover:border-[#3A3D45] transition-colors"
          >
            <motion.div
              className="absolute h-7 w-[34px] bg-[#A8FF3E] rounded-full"
              animate={{ x: lang === 'en' ? 1 : 35 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
            <span className={`relative z-10 flex-1 text-center text-xs font-bold ${lang === 'en' ? 'text-[#0F1117]' : 'text-[#6B7280]'}`}>
              EN
            </span>
            <span className={`relative z-10 flex-1 text-center text-xs font-bold ${lang === 'es' ? 'text-[#0F1117]' : 'text-[#6B7280]'}`}>
              ES
            </span>
          </button>

          {/* Login */}
          <Link
            href="/login"
            className="hidden sm:inline-flex h-9 px-4 items-center text-sm font-medium text-[#9CA3AF] hover:text-white transition-colors"
          >
            {lt(t.nav.login, lang)}
          </Link>

          {/* CTA */}
          <Link
            href="/login"
            className="group h-9 px-5 rounded-full bg-[#A8FF3E] text-[#0F1117] text-sm font-black inline-flex items-center gap-1.5 hover:bg-[#bfff6b] transition-colors shadow-lg shadow-[#A8FF3E]/20"
          >
            {lang === 'es' ? 'Probá Gratis' : 'Try Free'}
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}
