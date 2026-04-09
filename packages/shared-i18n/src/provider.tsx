import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  type AppLocale,
  DEFAULT_LOCALE,
  isSupportedLocale,
  interpolateMessage,
  MESSAGE_CATALOGS,
  normalizeLocale,
  SUPPORTED_LOCALES,
  type TranslationValues,
} from './core.js'

const STORAGE_KEY = 'infinity.locale'
const COOKIE_NAME = 'locale'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export interface I18nContextValue {
  locale: AppLocale
  supportedLocales: readonly AppLocale[]
  setLocale: (locale: AppLocale) => void
  t: (key: string, values?: TranslationValues) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  children: React.ReactNode
  initialLocale?: unknown
}

const resolveInitialLocale = (initialLocale?: unknown): AppLocale => {
  const fromInitial = normalizeLocale(initialLocale)
  if (fromInitial) {
    return fromInitial
  }

  if (typeof window !== 'undefined') {
    const fromStorage = normalizeLocale(window.localStorage.getItem(STORAGE_KEY))
    if (fromStorage) {
      return fromStorage
    }

    const fromNavigator = normalizeLocale(window.navigator.language)
    if (fromNavigator) {
      return fromNavigator
    }
  }

  return DEFAULT_LOCALE
}

const persistLocale = (locale: AppLocale) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(() => resolveInitialLocale(initialLocale))

  useEffect(() => {
    persistLocale(locale)
  }, [locale])

  const setLocale = useCallback((nextLocale: AppLocale) => {
    if (!isSupportedLocale(nextLocale)) {
      return
    }
    setLocaleState(nextLocale)
  }, [])

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      const selectedCatalog = MESSAGE_CATALOGS[locale]
      const fallbackCatalog = MESSAGE_CATALOGS[DEFAULT_LOCALE]
      const template = selectedCatalog[key] ?? fallbackCatalog[key] ?? key
      return interpolateMessage(template, values)
    },
    [locale]
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      supportedLocales: SUPPORTED_LOCALES,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18nContext = (): I18nContextValue => {
  const context = React.useContext(I18nContext)
  if (!context) {
    throw new Error('useI18nContext must be used inside I18nProvider')
  }
  return context
}
