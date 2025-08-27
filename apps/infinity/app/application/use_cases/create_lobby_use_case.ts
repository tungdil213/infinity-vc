import Lobby from '../../domain/entities/lobby.js'
import { PlayerRepository } from '../repositories/player_repository.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'
import { Result } from '../../domain/shared/result.js'

export interface CreateLobbyRequest {
  userUuid: string
  name: string
  maxPlayers?: number
  isPrivate?: boolean
}

export interface CreateLobbyResponse {
  uuid: string
  name: string
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
  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository
  ) {}

  async execute(request: CreateLobbyRequest): Promise<Result<CreateLobbyResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<CreateLobbyResponse>(validationResult.error)
      }

      // Vérifier que le joueur existe
      const player = await this.playerRepository.findPlayerInterfaceByUuidOrFail(request.userUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      // Si le joueur est déjà dans un lobby, le faire quitter automatiquement
      const existingLobby = await this.lobbyRepository.findByPlayer(request.userUuid)
      if (existingLobby) {
        const leaveResult = existingLobby.removePlayer(request.userUuid)
        if (!leaveResult.success) {
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
        maxPlayers: request.maxPlayers || 4,
        isPrivate: request.isPrivate || false,
      })

      // Sauvegarder le lobby
      await this.lobbyRepository.save(lobby)

      const response: CreateLobbyResponse = {
        uuid: lobby.uuid,
        name: lobby.name,
        status: lobby.status,
        currentPlayers: lobby.playerCount,
        maxPlayers: lobby.maxPlayers,
        isPrivate: lobby.isPrivate,
        hasAvailableSlots: lobby.hasAvailableSlots,
        canStart: lobby.canStart,
        createdBy: lobby.createdBy,
        players: lobby.players,
        availableActions: lobby.availableActions,
        createdAt: lobby.createdAt,
      }

      return Result.ok(response)
    } catch (error) {
      // System errors (DB down, IO errors, etc.)
      return Result.fail(
        `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private validateRequest(request: CreateLobbyRequest): Result<void> {
    if (!request.userUuid || !request.userUuid.trim()) {
      return Result.fail('User UUID is required')
    }
    if (!request.name || !request.name.trim()) {
      return Result.fail('Lobby name is required')
    }
    if (request.maxPlayers && (request.maxPlayers < 2 || request.maxPlayers > 8)) {
      return Result.fail('Max players must be between 2 and 8')
    }
    return Result.ok(undefined)
  }
}
