import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

interface PlayerData {
  uuid: string
  nickName: string
  isReady: boolean
  isOwner: boolean
}

interface OwnerChangedPayload {
  lobbyUuid: string
  previousOwner: PlayerData
  newOwner: PlayerData
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

/**
 * Event emitted when lobby ownership is transferred
 *
 * Triggered when:
 * - Current owner leaves and there are still players
 * - Oldest remaining player becomes new owner
 */
export class OwnerChangedEvent extends DomainEvent {
  constructor(payload: OwnerChangedPayload) {
    super('lobby.owner.changed', {
      lobbyId: payload.lobbyUuid,
      ...payload,
    })
  }

  get lobbyUuid(): string {
    return this.payload.lobbyUuid
  }

  get previousOwner(): PlayerData {
    return this.payload.previousOwner
  }

  get newOwner(): PlayerData {
    return this.payload.newOwner
  }

  get playerCount(): number {
    return this.payload.playerCount
  }

  get lobby(): OwnerChangedPayload['lobby'] {
    return this.payload.lobby
  }
}
