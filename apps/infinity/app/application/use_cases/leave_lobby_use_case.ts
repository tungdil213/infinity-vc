import { LobbyRepository } from '../repositories/lobby_repository.js'

export interface LeaveLobbyRequest {
  userUuid: string
  lobbyUuid: string
}

export interface LeaveLobbyResponse {
  success: boolean
  message: string
  lobbyDeleted?: boolean
}

export class LeaveLobbyUseCase {
  constructor(private lobbyRepository: LobbyRepository) {}

  async execute(request: LeaveLobbyRequest): Promise<LeaveLobbyResponse> {
    // Validation des données d'entrée
    this.validateRequest(request)

    // Récupérer le lobby
    const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)

    // Vérifier que le joueur est dans le lobby
    if (!lobby.hasPlayer(request.userUuid)) {
      throw new Error('Player is not in this lobby')
    }

    // Retirer le joueur du lobby
    lobby.removePlayer(request.userUuid)

    // Si le lobby est vide, le supprimer
    if (lobby.playerCount === 0) {
      await this.lobbyRepository.delete(lobby.uuid)
      return {
        success: true,
        message: 'Successfully left lobby. Lobby was deleted as it became empty.',
        lobbyDeleted: true,
      }
    }

    // Sinon, sauvegarder le lobby mis à jour
    await this.lobbyRepository.save(lobby)

    return {
      success: true,
      message: 'Successfully left lobby',
      lobbyDeleted: false,
    }
  }

  private validateRequest(request: LeaveLobbyRequest): void {
    if (!request.userUuid || !request.userUuid.trim()) {
      throw new Error('User UUID is required')
    }
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      throw new Error('Lobby UUID is required')
    }
  }
}
