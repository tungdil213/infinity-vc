import { defineConfig } from '@adonisjs/inertia'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * In dev, force a static assets version to avoid Inertia reading
   * the Vite manifest when a stale build manifest exists on disk.
   */
  assetsVersion: process.env.NODE_ENV === 'development' ? 'dev' : undefined,

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: false,
  },
})

export default inertiaConfig
