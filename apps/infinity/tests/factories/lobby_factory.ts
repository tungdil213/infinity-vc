import { CreateLobbyRequestDto, LobbyDto, PlayerDto } from '../../app/application/dtos/lobby_dto.js'

/**
 * Lobby Factory
 * Génère des données de test pour les lobbies
 */
export class LobbyFactory {
  private static counter = 1

  /**
   * Crée un CreateLobbyRequestDto avec des valeurs par défaut
   */
  static createLobbyRequest(overrides: Partial<CreateLobbyRequestDto> = {}): CreateLobbyRequestDto {
    return {
      userUuid: `user-${this.counter++}`,
      name: `Test Lobby ${this.counter}`,
      maxPlayers: 4,
      isPrivate: false,
      ...overrides,
    }
  }

  /**
   * Crée un LobbyDto avec des valeurs par défaut
   */
  static lobbyDto(overrides: Partial<LobbyDto> = {}): LobbyDto {
    const lobbyId = this.counter++
    const creatorUuid = `user-${lobbyId}`

    return {
      uuid: `lobby-${lobbyId}`,
      name: `Test Lobby ${lobbyId}`,
      createdBy: creatorUuid,
      maxPlayers: 4,
      isPrivate: false,
      status: 'OPEN',
      currentPlayers: 1,
      hasAvailableSlots: true,
      canStart: false,
      createdAt: new Date(),
      players: [this.playerDto({ uuid: creatorUuid })],
      availableActions: ['join', 'leave'],
      ...overrides,
    }
  }

  /**
   * Crée un PlayerDto avec des valeurs par défaut
   */
  static playerDto(overrides: Partial<PlayerDto> = {}): PlayerDto {
    const playerId = this.counter++
    return {
      uuid: `player-${playerId}`,
      nickName: `Player ${playerId}`,
      ...overrides,
    }
  }

  /**
   * Crée un lobby complet (prêt à démarrer)
   */
  static fullLobby(overrides: Partial<LobbyDto> = {}): LobbyDto {
    return this.lobbyDto({
      currentPlayers: 4,
      hasAvailableSlots: false,
      canStart: true,
      status: 'READY',
      players: [
        this.playerDto({ uuid: 'player-1', nickName: 'Player 1' }),
        this.playerDto({ uuid: 'player-2', nickName: 'Player 2' }),
        this.playerDto({ uuid: 'player-3', nickName: 'Player 3' }),
        this.playerDto({ uuid: 'player-4', nickName: 'Player 4' }),
      ],
      ...overrides,
    })
  }

  /**
   * Crée un lobby privé
   */
  static privateLobby(overrides: Partial<LobbyDto> = {}): LobbyDto {
    return this.lobbyDto({
      isPrivate: true,
      name: 'Private Lobby',
      ...overrides,
    })
  }

  /**
   * Crée plusieurs lobbies
   */
  static multipleLobbies(count: number, overrides: Partial<LobbyDto> = {}): LobbyDto[] {
    return Array.from({ length: count }, () => this.lobbyDto(overrides))
  }

  /**
   * Reset le compteur (utile pour les tests)
   */
  static resetCounter(): void {
    this.counter = 1
  }
}
