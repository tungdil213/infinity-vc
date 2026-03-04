import type Lobby from '../../domain/entities/lobby.js'
import { type LobbyDto, type PlayerDto, type CreateLobbyResponseDto } from '../dtos/lobby_dto.js'

/**
 * Lobby Serializer
 * Convertit entre les entités Lobby et les DTOs
 */
export class LobbySerializer {
  /**
   * Convertit une entité Lobby en LobbyDto
   */
  static toDto(lobby: Lobby): LobbyDto {
    return {
      uuid: lobby.uuid,
      name: lobby.name,
      createdBy: lobby.createdBy,
      gameType: lobby.gameType,
      maxPlayers: lobby.maxPlayers,
      isPrivate: lobby.isPrivate,
      status: lobby.status,
      currentPlayers: lobby.playerCount,
      hasAvailableSlots: lobby.hasAvailableSlots,
      canStart: lobby.canStart,
      createdAt: lobby.createdAt,
      players: lobby.players.map((player) => ({
        uuid: player.uuid,
        nickName: player.nickName,
      })),
      availableActions: lobby.availableActions,
    }
  }

  /**
   * Convertit une entité Lobby en CreateLobbyResponseDto
   */
  static toCreateResponseDto(lobby: Lobby): CreateLobbyResponseDto {
    return {
      uuid: lobby.uuid,
      name: lobby.name,
      gameType: lobby.gameType,
      status: lobby.status,
      currentPlayers: lobby.playerCount,
      maxPlayers: lobby.maxPlayers,
      isPrivate: lobby.isPrivate,
      hasAvailableSlots: lobby.hasAvailableSlots,
      canStart: lobby.canStart,
      createdBy: lobby.createdBy,
      players: lobby.players.map((player) => ({
        uuid: player.uuid,
        nickName: player.nickName,
      })),
      availableActions: lobby.availableActions,
      createdAt: lobby.createdAt,
    }
  }

  /**
   * Convertit un tableau d'entités Lobby en tableau de LobbyDto
   */
  static toDtoArray(lobbies: Lobby[]): LobbyDto[] {
    return lobbies.map((lobby) => this.toDto(lobby))
  }

  /**
   * Convertit un PlayerInterface en PlayerDto
   */
  static playerToDto(player: any): PlayerDto {
    return {
      uuid: player.uuid,
      nickName: player.nickName,
    }
  }
}
