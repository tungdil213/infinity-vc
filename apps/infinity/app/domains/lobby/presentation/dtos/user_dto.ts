/**
 * User Data Transfer Object
 * Représente les données d'un utilisateur sans logique métier
 */
export interface UserDto {
  readonly userUuid: string
  readonly fullName: string
  readonly email: string
  readonly isArchived: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Player Data Transfer Object (version étendue)
 */
export interface PlayerDto {
  readonly uuid: string
  readonly nickName: string
  readonly email?: string
  readonly isOnline?: boolean
  readonly lastSeen?: Date
}

/**
 * Register User Request DTO
 */
export interface RegisterUserRequestDto {
  readonly fullName: string
  readonly email: string
  readonly password: string
}

/**
 * Register User Response DTO
 */
export interface RegisterUserResponseDto {
  readonly userUuid: string
  readonly fullName: string
  readonly email: string
  readonly message: string
}

/**
 * Authenticate User Request DTO
 */
export interface AuthenticateUserRequestDto {
  readonly email: string
  readonly password: string
}

/**
 * Authenticate User Response DTO
 */
export interface AuthenticateUserResponseDto {
  readonly userUuid: string
  readonly fullName: string
  readonly email: string
  readonly token?: string
  readonly message: string
}
