import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  private readonly allowedLocales = new Set(['en', 'fr', 'de'])

  private resolveLocale(rawLocale: unknown): 'en' | 'fr' | 'de' {
    if (typeof rawLocale !== 'string') {
      return 'en'
    }

    const normalized = rawLocale.toLowerCase().trim()
    const shortLocale = normalized.split('-')[0]

    if (this.allowedLocales.has(shortLocale)) {
      return shortLocale as 'en' | 'fr' | 'de'
    }

    return 'en'
  }

  share(ctx: HttpContext) {
    const { session } = ctx as Partial<HttpContext>
    const locale = this.resolveLocale(ctx.i18n?.locale ?? ctx.request.cookie('locale'))

    return {
      locale: ctx.inertia.always(locale),
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      flash: ctx.inertia.always({
        error: session?.flashMessages.get('error'),
        success: session?.flashMessages.get('success'),
      }),
      toast: ctx.inertia.always({
        error: session?.flashMessages.get('error'),
        success: session?.flashMessages.get('success'),
        warning: session?.flashMessages.get('warning'),
        info: session?.flashMessages.get('info'),
      }),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    const output = await next()
    this.dispose(ctx)
    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = import('@adonisjs/inertia/types').InferSharedProps<InertiaMiddleware>

  export interface SharedProps extends MiddlewareSharedProps {}
}
