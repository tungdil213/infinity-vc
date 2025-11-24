import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

export class MovePlayedEvent extends DomainEvent {
  constructor(gameId: string, playerId: string, move: any, turnNumber: number) {
    super('game.move.played', { gameId, playerId, move, turnNumber })
  }

  get gameId(): string {
    return this.payload.gameId
  }

  get playerId(): string {
    return this.payload.playerId
  }

  get move(): any {
    return this.payload.move
  }

  get turnNumber(): number {
    return this.payload.turnNumber
  }
}
