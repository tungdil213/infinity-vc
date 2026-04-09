import { Lobby } from '@infinity.dev/lobby-domain/entities'
import { Result } from '@infinity.dev/lobby-domain/shared'
import type { LobbyRepository, PlayerRepository } from '../repositories/index.js'
import type { GameCatalogPort, GameDefinition, LobbyNotifier } from '../services/index.js'
import { safeSystemError } from '../shared/error_sanitizer.js'

const FALLBACK_GAME_DEFINITIONS: Record<string, GameDefinition> = {
  'love-letter-infinity-gauntlet': {
    gameId: 'love-letter-infinity-gauntlet',
    playerConstraints: {
      minPlayers: 2,
      maxPlayers: 6,
    },
  },
  'rock-paper-scissors': {
    gameId: 'rock-paper-scissors',
    playerConstraints: {
      minPlayers: 2,
      maxPlayers: 2,
    },
  },
}

const fallbackGameCatalog: GameCatalogPort = {
  findGameDefinition(gameId: string): GameDefinition | null {
    return FALLBACK_GAME_DEFINITIONS[gameId] ?? null
  },
  listGames(): GameDefinition[] {
    return Object.values(FALLBACK_GAME_DEFINITIONS)
  },
}

export interface CreateLobbyRequest {
  userUuid: string
  name: string
  description?: string
  maxPlayers?: number
  isPrivate?: boolean
  password?: string
  gameType: string
  gameSettings?: Record<string, unknown>
}

export interface CreateLobbyResponse {
  uuid: string
  name: string
  gameType: string
  status: string
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  players: Array<{
    uuid: string
    nickName: string
  }>
  availableActions: string[]
  createdAt: Date
}

export class CreateLobbyUseCase {
  private static readonly GAME_TYPE_ALIASES: Record<string, string> = {
    'love-letter': 'love-letter-infinity-gauntlet',
  }

  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository,
    private notificationService: LobbyNotifier,
    private gameCatalog: GameCatalogPort = fallbackGameCatalog
  ) {}

  async execute(request: CreateLobbyRequest): Promise<Result<CreateLobbyResponse>> {
    try {
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<CreateLobbyResponse>(validationResult.error)
      }

      const resolvedGameType = this.resolveGameType(request.gameType)
      const selectedGame = this.gameCatalog.findGameDefinition(resolvedGameType)
      if (!selectedGame) {
        return Result.fail(`Unknown gameType: ${request.gameType}`)
      }

      const requestedMaxPlayers = request.maxPlayers ?? selectedGame.playerConstraints.maxPlayers
      const { minPlayers, maxPlayers } = selectedGame.playerConstraints
      if (requestedMaxPlayers < minPlayers || requestedMaxPlayers > maxPlayers) {
        return Result.fail(`maxPlayers must be between ${minPlayers} and ${maxPlayers}`)
      }

      const player = await this.playerRepository.findPlayerInterfaceByUuid(request.userUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      const existingLobby = await this.lobbyRepository.findByPlayer(request.userUuid)
      if (existingLobby) {
        const leaveResult = existingLobby.removePlayer(request.userUuid)
        if (leaveResult.isFailure) {
          return Result.fail(`Failed to leave existing lobby: ${leaveResult.error}`)
        }

        if (existingLobby.playerCount === 0) {
          await this.lobbyRepository.delete(existingLobby.uuid)
        } else {
          await this.lobbyRepository.save(existingLobby)
        }
      }

      const lobby = Lobby.create({
        name: request.name,
        description: request.description,
        creator: player,
        maxPlayers: requestedMaxPlayers,
        isPrivate: request.isPrivate || false,
        passwordHash: request.password ? Lobby.hashPassword(request.password) : undefined,
        gameType: resolvedGameType,
        gameSettings: request.gameSettings,
      })

      await this.lobbyRepository.save(lobby)

      this.notificationService.notifyLobbyCreated(lobby.uuid, {
        uuid: lobby.uuid,
        name: lobby.name,
        description: lobby.description,
        status: lobby.status,
        currentPlayers: lobby.playerCount,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players,
        creator: lobby.creator,
        isPrivate: lobby.isPrivate,
        hasPassword: lobby.hasPassword,
        hasAvailableSlots: lobby.hasAvailableSlots,
        canStart: lobby.canStart,
        createdBy: lobby.createdBy,
        createdAt: lobby.createdAt,
      })

      const response = lobby.serialize() as CreateLobbyResponse
      return Result.ok(response)
    } catch (error) {
      return Result.fail(safeSystemError(error))
    }
  }

  private validateRequest(request: CreateLobbyRequest): Result<void> {
    if (!request.userUuid || !request.userUuid.trim()) {
      return Result.fail('User UUID is required')
    }
    if (!request.name || !request.name.trim()) {
      return Result.fail('Lobby name is required')
    }
    if (request.maxPlayers !== undefined && request.maxPlayers < 2) {
      return Result.fail('maxPlayers must be greater than or equal to 2')
    }
    if (!request.gameType || !request.gameType.trim()) {
      return Result.fail('gameType is required')
    }

    return Result.ok(undefined)
  }

  private resolveGameType(gameType: string): string {
    const normalizedGameType = CreateLobbyUseCase.GAME_TYPE_ALIASES[gameType]
    return normalizedGameType || gameType
  }
}
