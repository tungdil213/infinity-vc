import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

export class GameStartedEvent extends DomainEvent {
  constructor(lobbyId: string, gameId: string, playerIds: string[]) {
    super('lobby.game.started', { lobbyId, gameId, playerIds })
  }

  get lobbyId(): string {
    return this.payload.lobbyId
  }

  get gameId(): string {
    return this.payload.gameId
  }

  get playerIds(): string[] {
    return this.payload.playerIds
  }
}
