import Lobby from '#domain/entities/lobby'
import { createDefaultLauncher } from '@infinity.dev/game-engine'
import { type PlayerRepository } from '#application/repositories/player_repository'
import { type LobbyRepository } from '#application/repositories/lobby_repository'
import { Result } from '#shared/result'
import { type TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { safeSystemError } from '#shared/error_sanitizer'

export interface CreateLobbyRequest {
  userUuid: string
  name: string
  maxPlayers?: number
  isPrivate?: boolean
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
  private readonly launcher = createDefaultLauncher()
  private static readonly GAME_TYPE_ALIASES: Record<string, string> = {
    'love-letter': 'love-letter-infinity-gauntlet',
  }

  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository,
    private notificationService: TransmitLobbyService
  ) {}

  async execute(request: CreateLobbyRequest): Promise<Result<CreateLobbyResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<CreateLobbyResponse>(validationResult.error)
      }

      const resolvedGameType = this.resolveGameType(request.gameType)
      const selectedGame = this.launcher.getGameDefinition(resolvedGameType)
      if (!selectedGame) {
        return Result.fail(`Unknown gameType: ${request.gameType}`)
      }

      const requestedMaxPlayers = request.maxPlayers ?? selectedGame.playerConstraints.maxPlayers
      const { minPlayers, maxPlayers } = selectedGame.playerConstraints
      if (requestedMaxPlayers < minPlayers || requestedMaxPlayers > maxPlayers) {
        return Result.fail(`maxPlayers must be between ${minPlayers} and ${maxPlayers}`)
      }

      // Vérifier que le joueur existe
      const player = await this.playerRepository.findPlayerInterfaceByUuid(request.userUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      // Si le joueur est déjà dans un lobby, le faire quitter automatiquement
      const existingLobby = await this.lobbyRepository.findByPlayer(request.userUuid)
      if (existingLobby) {
        const leaveResult = existingLobby.removePlayer(request.userUuid)
        if (leaveResult.isFailure) {
          return Result.fail(`Failed to leave existing lobby: ${leaveResult.error}`)
        }

        // Si le lobby est maintenant vide, le supprimer
        if (existingLobby.playerCount === 0) {
          await this.lobbyRepository.delete(existingLobby.uuid)
        } else {
          // Sinon, sauvegarder les changements
          await this.lobbyRepository.save(existingLobby)
        }
      }

      // Créer le lobby
      const lobby = Lobby.create({
        name: request.name,
        creator: player,
        maxPlayers: requestedMaxPlayers,
        isPrivate: request.isPrivate || false,
        gameType: resolvedGameType,
        gameSettings: request.gameSettings,
      })

      // Sauvegarder le lobby
      await this.lobbyRepository.save(lobby)

      // Notifier la création du lobby pour la synchronisation temps réel
      this.notificationService.notifyLobbyCreated(lobby.uuid, {
        uuid: lobby.uuid,
        name: lobby.name,
        status: lobby.status,
        currentPlayers: lobby.playerCount,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players,
        creator: lobby.creator,
        isPrivate: lobby.isPrivate,
        hasAvailableSlots: lobby.hasAvailableSlots,
        canStart: lobby.canStart,
        createdBy: lobby.createdBy,
        createdAt: lobby.createdAt,
      })

      // Utiliser la sérialisation de l'entité pour garantir la cohérence
      const response = lobby.serialize() as CreateLobbyResponse

      return Result.ok(response)
    } catch (error) {
      return Result.fail(safeSystemError(error, 'create_lobby'))
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
