import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * CurrentLobbyMiddleware - Temporairement désactivé
 *
 * TODO: Réactiver après migration DDD complète
 * - Utiliser LobbyRepositoryLucid depuis #domains/lobby/infrastructure
 * - Adapter pour LobbyAggregate au lieu de l'ancien Lobby entity
 * - Implémenter méthode findByPlayer dans le nouveau repository
 */
export default class CurrentLobbyMiddleware {
  async handle({ inertia }: HttpContext, next: NextFn) {
    // Temporairement désactivé pendant la migration DDD
    // Les controllers passeront currentLobby directement via Inertia props

    inertia.share({
      currentLobby: null,
    })

    await next()
  }
}
