'use client'

import { useEffect, type ReactNode } from 'react'
import { I18nProvider } from '@/lib/i18n/context'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <I18nProvider>
      {children}
      <Toaster position="top-center" richColors />
    </I18nProvider>
  )
}
