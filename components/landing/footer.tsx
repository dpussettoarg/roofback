'use client'

import Link from 'next/link'
import t, { lt } from '@/lib/landing-translations'
import type { LandingLang } from '@/lib/landing-translations'

interface FooterProps {
  lang: LandingLang
}

export function Footer({ lang }: FooterProps) {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="space-y-4 max-w-sm">
            <Link href="/" className="flex items-center gap-0.5">
              <span className="text-xl font-extrabold bg-gradient-to-r from-[#00B4D8] to-[#38B000] bg-clip-text text-transparent tracking-tight">
                ROOF
              </span>
              <span className="text-xl font-extrabold text-white tracking-tight">
                BACK
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              {lt(t.footer.tagline, lang)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-6 text-sm">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {lang === 'es' ? 'Producto' : 'Product'}
              </h4>
              <div className="space-y-2">
                <a href="#how-it-works" className="block text-slate-400 hover:text-white transition-colors">
                  {lang === 'es' ? 'Como funciona' : 'How it works'}
                </a>
                <a href="#pricing" className="block text-slate-400 hover:text-white transition-colors">
                  {lang === 'es' ? 'Precios' : 'Pricing'}
                </a>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {lang === 'es' ? 'Cuenta' : 'Account'}
              </h4>
              <div className="space-y-2">
                <Link href="/login" className="block text-slate-400 hover:text-white transition-colors">
                  {lt(t.nav.login, lang)}
                </Link>
                <Link href="/login" className="block text-slate-400 hover:text-white transition-colors">
                  {lt(t.nav.cta, lang)}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {t.footer.copy}
          </p>
          <p className="text-xs text-slate-600">
            Made for roofers, by builders.
          </p>
        </div>
      </div>
    </footer>
  )
}
