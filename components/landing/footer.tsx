'use client'

import Link from 'next/link'
import type { LandingLang } from '@/lib/landing-translations'

interface FooterProps {
  lang: LandingLang
}

export function Footer({ lang }: FooterProps) {
  const isEs = lang === 'es'

  return (
    <footer className="bg-[#0F1117] border-t border-[#2A2D35]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Brand */}
          <div className="space-y-4 max-w-sm">
            <Link href="/" className="flex items-center gap-0.5">
              <span className="text-xl font-black text-[#A8FF3E] tracking-tight">ROOF</span>
              <span className="text-xl font-black text-white tracking-tight">BACK</span>
            </Link>
            <p className="text-[#6B7280] text-sm leading-relaxed">
              {isEs
                ? 'Hecho por techistas, para techistas. 20 años de experiencia en el techo, ahora en tu bolsillo.'
                : 'Built by roofers, for roofers. 20 years of roofing experience, now in your pocket.'}
            </p>
            <p className="text-xs text-[#6B7280]">
              {isEs ? 'Soporte:' : 'Support:'}{' '}
              <a href="mailto:hello@roofback.app" className="text-[#A8FF3E] hover:underline">
                hello@roofback.app
              </a>
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-x-16 gap-y-6 text-sm">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                {isEs ? 'Producto' : 'Product'}
              </h4>
              <div className="space-y-2">
                <a href="#how-it-works" className="block text-[#9CA3AF] hover:text-white transition-colors">
                  {isEs ? 'Cómo funciona' : 'How it works'}
                </a>
                <a href="#pricing" className="block text-[#9CA3AF] hover:text-white transition-colors">
                  {isEs ? 'Precios' : 'Pricing'}
                </a>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                {isEs ? 'Legal' : 'Legal'}
              </h4>
              <div className="space-y-2">
                <Link href="/terms" className="block text-[#9CA3AF] hover:text-white transition-colors">
                  {isEs ? 'Términos' : 'Terms'}
                </Link>
                <Link href="/privacy" className="block text-[#9CA3AF] hover:text-white transition-colors">
                  {isEs ? 'Privacidad' : 'Privacy'}
                </Link>
                <Link href="/login" className="block text-[#9CA3AF] hover:text-white transition-colors">
                  {isEs ? 'Iniciar Sesión' : 'Log In'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#2A2D35] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#6B7280]">
            &copy; 2026 RoofBack. {isEs ? 'Todos los derechos reservados.' : 'All rights reserved.'}
          </p>
          <p className="text-xs text-[#A8FF3E] font-semibold">
            {isEs ? 'Hecho por techistas, para techistas. 🦁' : 'Built by roofers, for roofers. 🦁'}
          </p>
        </div>
      </div>
    </footer>
  )
}
