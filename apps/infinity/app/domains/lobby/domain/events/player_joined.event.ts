import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

interface PlayerData {
  uuid: string
  nickName: string
  isReady: boolean
  isOwner: boolean
}

interface PlayerJoinedPayload {
  lobbyUuid: string
  player: PlayerData
  playerCount: number
  lobby: {
    uuid: string
    name: string
    status: string
    currentPlayers: number
    maxPlayers: number
    players: PlayerData[]
  }
}

export class PlayerJoinedEvent extends DomainEvent {
  constructor(payload: PlayerJoinedPayload) {
    super('lobby.player.joined', {
      lobbyId: payload.lobbyUuid,
      ...payload,
    })
  }

  get lobbyId(): string {
    return this.payload.lobbyId
  }

  get lobbyUuid(): string {
    return this.payload.lobbyUuid
  }

  get player(): PlayerData {
    return this.payload.player
  }

  get playerCount(): number {
    return this.payload.playerCount
  }

  get lobby(): PlayerJoinedPayload['lobby'] {
    return this.payload.lobby
  }
}
