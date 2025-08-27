import User from '../../domain/entities/user.js'
import { UserDto, PlayerDto, RegisterUserResponseDto, AuthenticateUserResponseDto } from '../dtos/user_dto.js'

/**
 * User Serializer
 * Convertit entre les entités User et les DTOs
 */
export class UserSerializer {
  /**
   * Convertit une entité User en UserDto
   */
  static toDto(user: User): UserDto {
    return {
      userUuid: user.userUuid,
      fullName: user.fullName,
      email: user.email,
      isArchived: user.isArchived,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }

  /**
   * Convertit une entité User en PlayerDto
   */
  static toPlayerDto(user: User): PlayerDto {
    return {
      uuid: user.userUuid,
      nickName: user.fullName,
      email: user.email,
      isOnline: true, // TODO: Implement online status
      lastSeen: new Date()
    }
  }

  /**
   * Convertit une entité User en RegisterUserResponseDto
   */
  static toRegisterResponseDto(user: User, message: string = 'User registered successfully'): RegisterUserResponseDto {
    return {
      userUuid: user.userUuid,
      fullName: user.fullName,
      email: user.email,
      message
    }
  }

  /**
   * Convertit une entité User en AuthenticateUserResponseDto
   */
  static toAuthenticateResponseDto(
    user: User, 
    token?: string, 
    message: string = 'Authentication successful'
  ): AuthenticateUserResponseDto {
    return {
      userUuid: user.userUuid,
      fullName: user.fullName,
      email: user.email,
      token,
      message
    }
  }

  /**
   * Convertit un tableau d'entités User en tableau de UserDto
   */
  static toDtoArray(users: User[]): UserDto[] {
    return users.map(user => this.toDto(user))
  }

  /**
   * Convertit un tableau d'entités User en tableau de PlayerDto
   */
  static toPlayerDtoArray(users: User[]): PlayerDto[] {
    return users.map(user => this.toPlayerDto(user))
  }
}
