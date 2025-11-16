import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

interface LobbyClosedPayload {
  lobbyUuid: string
  reason: 'empty' | 'cancelled'
  finalPlayerCount: number
}

/**
 * Event emitted when a lobby is closed/deleted
 *
 * Triggered when:
 * - Last player leaves (reason: 'empty')
 * - Owner cancels lobby (reason: 'cancelled')
 */
export class LobbyClosedEvent extends DomainEvent {
  constructor(payload: LobbyClosedPayload) {
    super('lobby.closed', {
      lobbyId: payload.lobbyUuid,
      ...payload,
    })
  }

  get lobbyUuid(): string {
    return this.payload.lobbyUuid
  }

  get reason(): 'empty' | 'cancelled' {
    return this.payload.reason
  }

  get finalPlayerCount(): number {
    return this.payload.finalPlayerCount
  }
}
