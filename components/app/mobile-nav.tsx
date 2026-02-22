'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Hammer, Users, Settings } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { href: '/jobs', icon: Hammer, labelKey: 'nav.jobs' },
  { href: '/customers', icon: Users, label_es: 'Clientes', label_en: 'Customers' },
  { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

export function MobileNav() {
  const pathname = usePathname()
  const { t, lang } = useI18n()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F1117]/95 backdrop-blur-lg border-t border-[#2A2D35] pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          const label = 'labelKey' in item
            ? t((item as { labelKey: string }).labelKey)
            : (lang === 'es' ? (item as { label_es: string }).label_es : (item as { label_en: string }).label_en)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-3 text-[10px] transition-colors min-h-[52px] justify-center relative ${
                isActive ? 'text-white font-semibold' : 'text-[#6B7280]'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{label}</span>
              {isActive && (
                <div className="absolute bottom-2 w-1 h-1 rounded-full bg-[#A8FF3E]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
