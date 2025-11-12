import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

export class GameCompletedEvent extends DomainEvent {
  constructor(gameId: string, winnerId: string | undefined) {
    super('game.completed', { gameId, winnerId })
  }

  get gameId(): string {
    return this.payload.gameId
  }

  get winnerId(): string | undefined {
    return this.payload.winnerId
  }
}
