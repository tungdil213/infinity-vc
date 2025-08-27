import { RegisterUserRequestDto, UserDto, PlayerDto, AuthenticateUserRequestDto } from '../../app/application/dtos/user_dto.js'

/**
 * User Factory
 * Génère des données de test pour les utilisateurs
 */
export class UserFactory {
  private static counter = 1

  /**
   * Crée un RegisterUserRequestDto avec des valeurs par défaut
   */
  static registerUserRequest(overrides: Partial<RegisterUserRequestDto> = {}): RegisterUserRequestDto {
    const userId = this.counter++
    return {
      fullName: `Test User ${userId}`,
      email: `user${userId}@test.com`,
      password: 'password123',
      ...overrides
    }
  }

  /**
   * Crée un AuthenticateUserRequestDto avec des valeurs par défaut
   */
  static authenticateUserRequest(overrides: Partial<AuthenticateUserRequestDto> = {}): AuthenticateUserRequestDto {
    const userId = this.counter++
    return {
      email: `user${userId}@test.com`,
      password: 'password123',
      ...overrides
    }
  }

  /**
   * Crée un UserDto avec des valeurs par défaut
   */
  static userDto(overrides: Partial<UserDto> = {}): UserDto {
    const userId = this.counter++
    const now = new Date()
    
    return {
      userUuid: `user-${userId}`,
      fullName: `Test User ${userId}`,
      email: `user${userId}@test.com`,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      ...overrides
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
      email: `player${playerId}@test.com`,
      isOnline: true,
      lastSeen: new Date(),
      ...overrides
    }
  }

  /**
   * Crée un utilisateur archivé
   */
  static archivedUser(overrides: Partial<UserDto> = {}): UserDto {
    return this.userDto({
      isArchived: true,
      fullName: 'Archived User',
      ...overrides
    })
  }

  /**
   * Crée un utilisateur admin
   */
  static adminUser(overrides: Partial<UserDto> = {}): UserDto {
    return this.userDto({
      fullName: 'Admin User',
      email: 'admin@test.com',
      ...overrides
    })
  }

  /**
   * Crée plusieurs utilisateurs
   */
  static multipleUsers(count: number, overrides: Partial<UserDto> = {}): UserDto[] {
    return Array.from({ length: count }, () => this.userDto(overrides))
  }

  /**
   * Crée plusieurs joueurs
   */
  static multiplePlayers(count: number, overrides: Partial<PlayerDto> = {}): PlayerDto[] {
    return Array.from({ length: count }, () => this.playerDto(overrides))
  }

  /**
   * Reset le compteur (utile pour les tests)
   */
  static resetCounter(): void {
    this.counter = 1
  }
}
