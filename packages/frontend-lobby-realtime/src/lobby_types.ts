export interface LobbyData {
  uuid: string
  name: string
  description?: string
  gameType?: string
  gameUuid?: string
  status: string
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasPassword?: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  players: Array<{
    uuid: string
    nickName: string
  }>
  createdAt: string
}

export interface LobbyListState {
  lobbies: LobbyData[]
  loading: boolean
  error: string | null
  total: number
}

export interface LobbyDetailState {
  lobby: LobbyData | null
  loading: boolean
  error: string | null
}

export interface LobbyFilters {
  status?: string
  hasSlots?: boolean
  includePrivate?: boolean
}

export interface CreateLobbyPayload {
  name: string
  gameType: string
  maxPlayers?: number
  isPrivate?: boolean
  userUuid: string
}
