import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class CurrentLobbyMiddleware {
  constructor(private lobbyRepository: HybridLobbyService) {}

  async handle({ auth, inertia }: HttpContext, next: NextFn) {
    // Only run for authenticated users
    if (auth.user) {
      try {
        const currentLobby = await this.lobbyRepository.findByPlayer(auth.user.userUuid)

        // Share currentLobby data globally with all Inertia pages
        inertia.share({
          currentLobby: currentLobby
            ? {
                uuid: currentLobby.uuid,
                name: currentLobby.name,
                status: currentLobby.status,
                currentPlayers: currentLobby.players.length,
                maxPlayers: currentLobby.maxPlayers,
              }
            : (null as any),
        })
      } catch (error) {
        logger.warn(
          { operation: 'current_lobby_fetch', reason: error instanceof Error ? error.message : 'unknown' },
          'Failed to resolve current lobby, continuing request'
        )
        // Don't block the request if lobby fetch fails
        inertia.share({ currentLobby: null as any })
      }
    } else {
      // For non-authenticated users
      inertia.share({ currentLobby: null as any })
    }

    await next()
  }
}
