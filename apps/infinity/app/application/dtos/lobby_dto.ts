/**
 * Lobby Data Transfer Object
 * Représente les données d'un lobby sans logique métier
 */
export interface LobbyDto {
  readonly uuid: string
  readonly name: string
  readonly description?: string
  readonly createdBy: string
  readonly gameType: string
  readonly maxPlayers: number
  readonly isPrivate: boolean
  readonly hasPassword: boolean
  readonly status: string
  readonly currentPlayers: number
  readonly hasAvailableSlots: boolean
  readonly canStart: boolean
  readonly createdAt: Date
  readonly players: PlayerDto[]
  readonly availableActions: string[]
}

/**
 * Player Data Transfer Object
 */
export interface PlayerDto {
  readonly uuid: string
  readonly nickName: string
}

/**
 * Create Lobby Request DTO
 */
export interface CreateLobbyRequestDto {
  readonly userUuid: string
  readonly name: string
  readonly description?: string
  readonly maxPlayers?: number
  readonly isPrivate?: boolean
  readonly password?: string
  readonly gameType: string
}

/**
 * Create Lobby Response DTO
 */
export interface CreateLobbyResponseDto {
  readonly uuid: string
  readonly name: string
  readonly description?: string
  readonly gameType: string
  readonly status: string
  readonly currentPlayers: number
  readonly maxPlayers: number
  readonly isPrivate: boolean
  readonly hasPassword: boolean
  readonly hasAvailableSlots: boolean
  readonly canStart: boolean
  readonly createdBy: string
  readonly players: PlayerDto[]
  readonly availableActions: string[]
  readonly createdAt: Date
}

/**
 * Join Lobby Request DTO
 */
export interface JoinLobbyRequestDto {
  readonly userUuid: string
  readonly lobbyUuid: string
  readonly password?: string
}

/**
 * Join Lobby Response DTO
 */
export interface JoinLobbyResponseDto {
  readonly success: boolean
  readonly lobby: LobbyDto
  readonly message: string
}

/**
 * Leave Lobby Request DTO
 */
export interface LeaveLobbyRequestDto {
  readonly userUuid: string
  readonly lobbyUuid: string
}

/**
 * Leave Lobby Response DTO
 */
export interface LeaveLobbyResponseDto {
  readonly success: boolean
  readonly lobbyDeleted: boolean
  readonly message: string
}
