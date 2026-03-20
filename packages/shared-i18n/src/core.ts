import { deMessages } from './messages/de.js'
import { enMessages } from './messages/en.js'
import { frMessages } from './messages/fr.js'

export { enMessages, frMessages, deMessages }

export const SUPPORTED_LOCALES = ['en', 'fr', 'de'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export type TranslationValues = Record<string, string | number>
export type MessageCatalog = Record<string, string>

export const DEFAULT_LOCALE: AppLocale = 'en'

export const MESSAGE_CATALOGS: Record<AppLocale, MessageCatalog> = {
  en: enMessages,
  fr: frMessages,
  de: deMessages,
}

export const isSupportedLocale = (value: unknown): value is AppLocale => {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value.toLowerCase())
  )
}

export const normalizeLocale = (value: unknown): AppLocale | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.toLowerCase()
  if ((SUPPORTED_LOCALES as readonly string[]).includes(normalized)) {
    return normalized as AppLocale
  }

  const short = normalized.split('-')[0]
  if ((SUPPORTED_LOCALES as readonly string[]).includes(short)) {
    return short as AppLocale
  }

  return null
}

export const interpolateMessage = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}
