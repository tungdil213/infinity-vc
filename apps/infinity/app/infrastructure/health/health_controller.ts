/**
 * Health Check Controller
 *
 * Endpoints pour vérifier la santé de l'application et ses dépendances
 */

import type { HttpContext } from '@adonisjs/core/http'
import Database from '@adonisjs/lucid/services/db'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('HealthController')

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  version?: string
  services: {
    database: ServiceHealth
    redis?: ServiceHealth
    cache?: ServiceHealth
  }
}

interface ServiceHealth {
  status: 'ok' | 'down'
  latency?: number
  error?: string
}

export default class HealthController {
  /**
   * GET /health
   * Health check simple (pour load balancers)
   */
  async index({ response }: HttpContext) {
    try {
      // Check database rapidement
      await Database.rawQuery('SELECT 1')

      return response.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error({ error }, 'Health check failed')
      return response.status(503).json({
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Service unavailable',
      })
    }
  }

  /**
   * GET /health/detailed
   * Health check détaillé (pour monitoring)
   */
  async detailed({ response }: HttpContext) {
    const health: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      services: {
        database: await this.checkDatabase(),
        // redis: await this.checkRedis(), // TODO: Activer quand Redis configuré
        // cache: await this.checkCache(),
      },
    }

    // Déterminer le statut global
    const servicesStatus = Object.values(health.services).map((s) => s.status)
    if (servicesStatus.includes('down')) {
      health.status = servicesStatus.every((s) => s === 'down') ? 'down' : 'degraded'
    }

    const httpStatus = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503

    return response.status(httpStatus).json(health)
  }

  /**
   * GET /health/ready
   * Readiness probe (K8s)
   */
  async ready({ response }: HttpContext) {
    try {
      // Check que tous les services critiques sont OK
      const dbHealth = await this.checkDatabase()

      if (dbHealth.status === 'down') {
        throw new Error('Database not ready')
      }

      return response.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.warn({ error }, 'Service not ready')
      return response.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * GET /health/live
   * Liveness probe (K8s)
   */
  async live({ response }: HttpContext) {
    // Simple check que le process répond
    return response.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    })
  }

  /**
   * Vérifier la connexion à la base de données
   */
  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now()

    try {
      await Database.rawQuery('SELECT 1')
      const latency = Date.now() - startTime

      return {
        status: 'ok',
        latency,
      }
    } catch (error) {
      logger.error({ error }, 'Database health check failed')
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Vérifier la connexion à Redis
   * TODO: Implémenter quand Redis sera configuré
   */
  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now()

    try {
      // TODO: const redis = await app.container.make('redis')
      // await redis.ping()
      const latency = Date.now() - startTime

      return {
        status: 'ok',
        latency,
      }
    } catch (error) {
      logger.error({ error }, 'Redis health check failed')
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Vérifier le cache
   */
  private async checkCache(): Promise<ServiceHealth> {
    const startTime = Date.now()

    try {
      // TODO: Tester le cache service
      const latency = Date.now() - startTime

      return {
        status: 'ok',
        latency,
      }
    } catch (error) {
      logger.error({ error }, 'Cache health check failed')
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
