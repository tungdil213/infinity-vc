import Game from '#domain/entities/game'
import { type LobbyRepository } from '#application/repositories/lobby_repository'
import { type GameRepository } from '#application/repositories/game_repository'
import { type TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { gameEngineService } from '#application/services/game_engine_service'
import {
  StartGameUseCase as LobbyApplicationStartGameUseCase,
  type StartGameRequest,
  type StartGameResponse,
  type PersistedGameFactory,
} from '@infinity.dev/lobby-application/use-cases'
import type { GameRuntimePort } from '@infinity.dev/lobby-application/services'

const createPersistedGame: PersistedGameFactory = (input) => {
  return Game.create({
    uuid: input.uuid,
    players: input.players,
    gameData: input.gameData,
  })
}

export class StartGameUseCase extends LobbyApplicationStartGameUseCase {
  constructor(
    lobbyRepository: LobbyRepository,
    gameRepository: GameRepository,
    notificationService: TransmitLobbyService,
    gameRuntime: GameRuntimePort = gameEngineService
  ) {
    super(
      lobbyRepository,
      gameRepository,
      notificationService,
      gameRuntime,
      createPersistedGame
    )
  }
}

export type { StartGameRequest, StartGameResponse }
