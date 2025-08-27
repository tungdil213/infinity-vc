import { LobbyRepository } from '../repositories/lobby_repository.js'
import { Result } from '../../domain/shared/result.js'
import { LobbySerializer } from '../serializers/lobby_serializer.js'
import { LobbyDto } from '../dtos/lobby_dto.js'

export interface ShowLobbyRequest {
  lobbyUuid: string
  userUuid?: string // Optional for permission checks
}

export interface ShowLobbyResponse {
  lobby: LobbyDto
}

export class ShowLobbyUseCase {
  constructor(private lobbyRepository: LobbyRepository) {}

  async execute(request: ShowLobbyRequest): Promise<Result<ShowLobbyResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<ShowLobbyResponse>(validationResult.error)
      }

      // Récupérer le lobby
      const lobby = await this.lobbyRepository.findByUuid(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      // Convertir en DTO pour découpler la couche domaine
      const lobbyDto = LobbySerializer.toDto(lobby)

      const response: ShowLobbyResponse = {
        lobby: lobbyDto,
      }

      return Result.ok(response)
    } catch (error) {
      return Result.fail(
        `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private validateRequest(request: ShowLobbyRequest): Result<void> {
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      return Result.fail('Lobby UUID is required')
    }
    return Result.ok(undefined)
  }
}
