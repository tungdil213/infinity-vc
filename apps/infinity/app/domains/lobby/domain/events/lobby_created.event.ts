import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

interface PlayerData {
  uuid: string
  nickName: string
  isReady: boolean
  isOwner: boolean
}

interface LobbyData {
  uuid: string
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
  minPlayers: number
  isPrivate: boolean
  gameType: string
  ownerId: string
  players: PlayerData[]
}

export class LobbyCreatedEvent extends DomainEvent {
  constructor(lobbyData: LobbyData) {
    super('lobby.created', {
      lobbyId: lobbyData.uuid,
      lobby: lobbyData,
    })
  }

  get lobbyId(): string {
    return this.payload.lobbyId
  }

  get lobby(): LobbyData {
    return this.payload.lobby
  }
}
