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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white pb-safe">
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
                'flex flex-col items-center gap-0.5 px-4 py-3 text-xs transition-colors',
                isActive ? 'text-emerald-600 font-semibold' : 'text-gray-500'
              )}
            >
              <item.icon className={cn('h-6 w-6', isActive && 'text-emerald-600')} />
              {t(item.labelKey)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
