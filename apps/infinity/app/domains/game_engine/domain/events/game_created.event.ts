import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

export class GameCreatedEvent extends DomainEvent {
  constructor(gameId: string, lobbyId: string, gameType: string, playerIds: string[]) {
    super('game.created', { gameId, lobbyId, gameType, playerIds })
  }

  get gameId(): string {
    return this.payload.gameId
  }

  get lobbyId(): string {
    return this.payload.lobbyId
  }

  get gameType(): string {
    return this.payload.gameType
  }

  get playerIds(): string[] {
    return this.payload.playerIds
  }
}
