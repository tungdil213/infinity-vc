import { defineConfig } from '@adonisjs/shield'

const isDevelopment = process.env.NODE_ENV === 'development'

const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more
   */
  csp: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : [])],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.bunny.net'],
      fontSrc: ["'self'", 'https://fonts.bunny.net', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: [
        "'self'",
        ...(isDevelopment ? ['ws://localhost:24678', 'ws://127.0.0.1:24678'] : []),
      ],
    },
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more
   */
  csrf: {
    enabled: true,
    exceptRoutes: [],
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iFrames
   */
  xFrame: {
    enabled: true,
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS
   */
  hsts: {
    enabled: true,
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing the content type of a
   * response and always rely on the "content-type" header.
   */
  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig
