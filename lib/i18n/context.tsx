'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { translations, type Lang } from './translations'

interface I18nContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default: English. Priority order (highest → lowest):
  //   1. DB profile.language_preference  (source of truth)
  //   2. localStorage roofback_lang      (offline / pre-login cache)
  //   3. 'en'                            (safe default)
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    async function syncLang() {
      // Step 1: apply localStorage immediately so there's no flash
      const cached = localStorage.getItem('roofback_lang') as Lang | null
      if (cached === 'es' || cached === 'en') {
        setLangState(cached)
      }

      // Step 2: fetch DB preference and override if different
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: prof } = await supabase
          .from('profiles')
          .select('language_preference')
          .eq('id', user.id)
          .single()

        const dbLang = prof?.language_preference as Lang | null
        if (dbLang === 'es' || dbLang === 'en') {
          setLangState(dbLang)
          localStorage.setItem('roofback_lang', dbLang)
        }
      } catch {
        // Silently fall back to cached / default
      }
    }
    syncLang()
  }, [])

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l)
    localStorage.setItem('roofback_lang', l)

    // Persist to DB so the preference survives across devices/sessions
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ language_preference: l, updated_at: new Date().toISOString() })
          .eq('id', user.id)
      }
    } catch {
      // Non-fatal — localStorage is still updated
    }
  }, [])

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = translations[lang]
      for (const k of keys) {
        value = value?.[k]
      }
      return (typeof value === 'string' ? value : key)
    },
    [lang]
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
