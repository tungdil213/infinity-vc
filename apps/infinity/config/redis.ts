/**
 * Configuration Redis pour le projet Infinity
 *
 * 3 connexions séparées pour une meilleure isolation :
 * - main: Event bus (Pub/Sub)
 * - cache: Cache applicatif
 * - sessions: Sessions utilisateurs
 */

import env from '#start/env'

export const redisConfig = {
  connection: env.get('REDIS_CONNECTION', 'main'),

  connections: {
    // Connection 1: Event Bus (Pub/Sub pour scalabilité horizontale)
    main: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', 6379),
      password: env.get('REDIS_PASSWORD'),
      db: 0,
      keyPrefix: 'infinity:events:',
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    },

    // Connection 2: Cache (données temporaires avec TTL)
    cache: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', 6379),
      password: env.get('REDIS_PASSWORD'),
      db: 1,
      keyPrefix: 'infinity:cache:',
      retryStrategy: (times: number) => {
        if (times > 3) return null // Stop after 3 retries
        return Math.min(times * 100, 3000)
      },
      lazyConnect: true,
    },

    // Connection 3: Sessions (authentification)
    sessions: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', 6379),
      password: env.get('REDIS_PASSWORD'),
      db: 2,
      keyPrefix: 'infinity:session:',
      retryStrategy: (times: number) => {
        if (times > 5) return null // More retries for sessions
        return Math.min(times * 200, 5000)
      },
      lazyConnect: true,
    },
  },
}

export default redisConfig
