import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'

const LOCALE_COOKIE_NAME = 'locale'
const SUPPORTED_LOCALES = new Set(['en', 'fr', 'de'])
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * The "DetectUserLocaleMiddleware" middleware uses i18n service to share
 * a request specific i18n object with the HTTP Context
 */
export default class DetectUserLocaleMiddleware {
  /**
   * Using i18n for validation messages. Applicable to only
   * "request.validateUsing" method calls
   */
  static {
    RequestValidator.messagesProvider = (ctx) => {
      return ctx.i18n.createMessagesProvider()
    }
  }

  /**
   * This method reads the user language from the "Accept-Language"
   * header and returns the best matching locale by checking it
   * against the supported locales.
   *
   * Feel free to use different mechanism for finding user language.
   */
  private normalizeLocale(rawLocale: unknown): string | null {
    if (typeof rawLocale !== 'string') {
      return null
    }

    const normalized = rawLocale.toLowerCase().trim()
    if (!normalized) {
      return null
    }

    if (SUPPORTED_LOCALES.has(normalized)) {
      return normalized
    }

    const shortLocale = normalized.split('-')[0]
    if (SUPPORTED_LOCALES.has(shortLocale)) {
      return shortLocale
    }

    return null
  }

  protected getRequestLocale(ctx: HttpContext) {
    const localeFromCookie = this.normalizeLocale(ctx.request.cookie(LOCALE_COOKIE_NAME))
    if (localeFromCookie) {
      return localeFromCookie
    }

    const localeFromHeader = i18nManager.getSupportedLocaleFor(ctx.request.languages())
    return this.normalizeLocale(localeFromHeader) || this.normalizeLocale(i18nManager.defaultLocale)
  }

  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Finding user language
     */
    const language = this.getRequestLocale(ctx) || i18nManager.defaultLocale

    /**
     * Assigning i18n property to the HTTP context
     */
    ctx.i18n = i18nManager.locale(language)

    /**
     * Binding I18n class to the request specific instance of it.
     * Doing so will allow IoC container to resolve an instance
     * of request specific i18n object when I18n class is
     * injected somewhere.
     */
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    /**
     * Sharing request specific instance of i18n with edge
     * templates.
     *
     * Remove the following block of code, if you are not using
     * edge templates.
     */
    if ('view' in ctx) {
      ctx.view.share({ i18n: ctx.i18n })
    }

    const cookieLocale = this.normalizeLocale(ctx.request.cookie(LOCALE_COOKIE_NAME))
    if (cookieLocale !== ctx.i18n.locale) {
      ctx.response.cookie(LOCALE_COOKIE_NAME, ctx.i18n.locale, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: LOCALE_COOKIE_MAX_AGE,
      })
    }

    return next()
  }
}

/**
 * Notify TypeScript about i18n property
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
