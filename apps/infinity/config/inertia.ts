import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps, PageProps } from '@adonisjs/inertia/types'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: '../../inertia/resources/views/inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    errors: (ctx) => ctx.inertia.always(() => ctx.session?.flashMessages.get('errors')),
    toast: (ctx) =>
      ctx.inertia.always(() => ({
        success: ctx.session?.flashMessages.get('success'),
        error: ctx.session?.flashMessages.get('error'),
        warning: ctx.session?.flashMessages.get('warning'),
        info: ctx.session?.flashMessages.get('info'),
      })),
    user: (ctx) =>
      ctx.auth?.user
        ? {
            uuid: ctx.auth.user.userUuid,
            fullName: ctx.auth.user.fullName,
            email: ctx.auth.user.email,
            nickName: ctx.auth.user.username,
          }
        : null,
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig>, PageProps {
    user: {
      uuid: string
      fullName: string | null
      email: string
      nickName: string
    } | null
  }
}
