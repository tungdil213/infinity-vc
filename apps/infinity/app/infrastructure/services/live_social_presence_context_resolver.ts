import { inject } from '@adonisjs/core'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { safeSystemError } from '#shared/error_sanitizer'
import { Result } from '#shared/result'
import type {
  SocialPresenceContext,
  SocialPresenceContextResolver,
} from '#application/services/social_presence_context_resolver'

@inject()
export class LiveSocialPresenceContextResolver implements SocialPresenceContextResolver {
  constructor(
    private readonly gameRepository: DatabaseGameRepository,
    private readonly lobbyRepository: HybridLobbyService
  ) {}

  async resolve(userUuid: string): Promise<Result<SocialPresenceContext>> {
    try {
      const activeGames = await this.gameRepository.findActiveByPlayer(userUuid)
      if (activeGames.length > 0) {
        const activeGame = [...activeGames].sort(
          (left, right) => right.startedAt.getTime() - left.startedAt.getTime()
        )[0]
        const runtime = activeGame.gameData.runtime ?? {}
        const lobbyId = typeof runtime.lobbyId === 'string' ? runtime.lobbyId : null
        const lobby =
          typeof lobbyId === 'string' && lobbyId.length > 0
            ? await this.lobbyRepository.findByUuid(lobbyId)
            : null

        return Result.ok({
          status: 'in_game',
          lobbyId,
          lobbyName: lobby?.name ?? null,
          gameId: activeGame.uuid,
        })
      }

      const lobby = await this.lobbyRepository.findByPlayer(userUuid)
      if (lobby) {
        return Result.ok({
          status: 'in_lobby',
          lobbyId: lobby.uuid,
          lobbyName: lobby.name,
          gameId: null,
        })
      }

      return Result.ok({
        status: 'online',
        lobbyId: null,
        lobbyName: null,
        gameId: null,
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'resolve_social_presence_context'))
    }
  }
}
