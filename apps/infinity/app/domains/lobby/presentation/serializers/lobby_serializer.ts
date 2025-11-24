import type { LobbyAggregate } from '../../domain/aggregates/lobby.aggregate.js'
import type { Player } from '../../domain/entities/player.entity.js'
import { LobbyDto, PlayerDto, CreateLobbyResponseDto } from '../dtos/lobby_dto.js'

/**
 * Lobby Serializer
 * Convertit entre les entités Lobby et les DTOs
 */
export class LobbySerializer {
  /**
   * Convertit une entité Lobby en LobbyDto
   */
  static toDto(aggregate: LobbyAggregate): LobbyDto {
    const lobby = aggregate.lobbyEntity
    const players = aggregate.playersList

    const hasAvailableSlots = players.length < lobby.settings.maxPlayers
    const canStart = players.length >= lobby.settings.minPlayers

    return {
      uuid: lobby.id,
      name: lobby.settings.name,
      createdBy: lobby.ownerId,
      maxPlayers: lobby.settings.maxPlayers,
      isPrivate: lobby.settings.isPrivate,
      status: lobby.status,
      currentPlayers: players.length,
      hasAvailableSlots,
      canStart,
      createdAt: lobby.createdAt,
      players: players.map((player) => this.playerToDto(player)),
      availableActions: [],
    }
  }

  /**
   * Convertit une entité Lobby en CreateLobbyResponseDto
   */
  static toCreateResponseDto(aggregate: LobbyAggregate): CreateLobbyResponseDto {
    const dto = this.toDto(aggregate)
    return {
      ...dto,
    }
  }

  /**
   * Convertit un tableau d'entités Lobby en tableau de LobbyDto
   */
  static toDtoArray(lobbies: LobbyAggregate[]): LobbyDto[] {
    return lobbies.map((lobby) => this.toDto(lobby))
  }

  /**
   * Convertit un PlayerInterface en PlayerDto
   */
  static playerToDto(player: Player): PlayerDto {
    return {
      uuid: player.userId,
      nickName: player.username,
    }
  }
}
