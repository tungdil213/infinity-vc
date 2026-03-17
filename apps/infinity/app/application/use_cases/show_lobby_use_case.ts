import { type LobbyRepository } from '#application/repositories/lobby_repository'
import { Result } from '#shared/result'
import { LobbySerializer } from '#application/serializers/lobby_serializer'
import { type LobbyDto } from '#application/dtos/lobby_dto'
import { safeSystemError } from '#shared/error_sanitizer'

export interface ShowLobbyRequest {
  lobbyUuid: string
  userUuid?: string // Optional for permission checks
}

export class ShowLobbyUseCase {
  constructor(private lobbyRepository: LobbyRepository) {}

  async execute(request: ShowLobbyRequest): Promise<Result<LobbyDto>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<LobbyDto>(validationResult.error)
      }

      // Récupérer le lobby
      const lobby = await this.lobbyRepository.findByUuid(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      // Si c'est déjà un DTO (pour les tests), on le retourne directement
      let lobbyDto: any
      if (lobby.serialize && typeof lobby.serialize === 'function') {
        lobbyDto = lobby.serialize()
      } else if (lobby.uuid && lobby.name) {
        // C'est déjà un DTO ou un objet simple
        lobbyDto = lobby
      } else {
        // Convertir en DTO pour découpler la couche domaine
        lobbyDto = LobbySerializer.toDto(lobby)
      }

      return Result.ok(lobbyDto)
    } catch (error) {
      return Result.fail(safeSystemError(error, 'show_lobby'))
    }
  }

  private validateRequest(request: ShowLobbyRequest): Result<void> {
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      return Result.fail('Lobby UUID is required')
    }
    return Result.ok(undefined)
  }
}
