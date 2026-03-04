import '@adonisjs/inertia/types'

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    [page: string]: import('@adonisjs/inertia/types').ComponentProps
  }
}
