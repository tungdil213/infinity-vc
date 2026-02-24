import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import type { StatsEngine } from 'adonisjs-server-stats'

export default class ServerStatsController {
  async index({ response }: HttpContext) {
    if (!app.inDev) {
      return response.notFound({ message: 'Not found' })
    }

    const engine = (await app.container.make('server_stats.engine')) as StatsEngine

    return response.json(engine.getLatestStats())
  }
}
