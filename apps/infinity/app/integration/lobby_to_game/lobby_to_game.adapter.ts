import type { LobbyAggregate } from '../../domains/lobby/domain/aggregates/lobby.aggregate.js'
import { Result } from '#shared_kernel/domain/result'

/**
 * Anti-Corruption Layer: Lobby → Game
 * Adapte les données du lobby pour créer un jeu
 */
export class LobbyToGameAdapter {
  public static prepareGameData(lobbyAggregate: LobbyAggregate): Result<{
    lobbyId: string
    gameType: string
    playerIds: string[]
    playerCount: number
  }> {
    const lobby = lobbyAggregate.lobbyEntity
    const players = lobbyAggregate.playersList

    if (players.length < lobby.settings.minPlayers) {
      return Result.fail('Not enough players to start game')
    }

    return Result.ok({
      lobbyId: lobby.id,
      gameType: lobby.settings.gameType,
      playerIds: players.map((p) => p.userId),
      playerCount: players.length,
    })
  }
}
