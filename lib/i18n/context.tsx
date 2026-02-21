'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { translations, type Lang } from './translations'

interface I18nContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default is English for new / unrecognised users
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('roofback_lang') as Lang | null
    if (saved === 'es' || saved === 'en') {
      setLangState(saved)
    }
    // If nothing saved yet the default ('en') already set above is correct
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('roofback_lang', l)
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
