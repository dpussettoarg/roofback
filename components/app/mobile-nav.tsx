'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Hammer, Settings } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { href: '/jobs', icon: Hammer, labelKey: 'nav.jobs' },
  { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

export function MobileNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-100 pb-safe">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-5 py-3 text-xs transition-colors min-h-[48px] justify-center',
                isActive ? 'text-[#008B99] font-semibold' : 'text-slate-400'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-[#008B99]')} />
              <span className="mt-0.5">{t(item.labelKey)}</span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-brand-horizontal" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
