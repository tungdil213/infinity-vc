import type { EventBus } from '#infrastructure/events/event_bus'
import { eventBus } from '#infrastructure/events/event_bus'
import type { GameSession } from '#application/services/game_engine_types'

interface ActionEvent {
  type: string
  payload: unknown
}

type StartedPlayer = {
  uuid: string
  nickName: string
}

export class GameEngineEventPublisher {
  constructor(private readonly bus: EventBus = eventBus) {}

  publishGameStarted(session: GameSession, players: StartedPlayer[]): void {
    this.bus.publish({
      id: crypto.randomUUID(),
      type: 'game.started',
      timestamp: new Date(),
      payload: {
        gameId: session.gameId,
        lobbyId: session.lobbyId,
        players,
      },
    })
  }

  publishActionEvents(gameId: string, events: ActionEvent[]): void {
    for (const event of events) {
      const eventPayload =
        typeof event.payload === 'object' && event.payload !== null
          ? { gameId, ...(event.payload as Record<string, unknown>) }
          : { gameId, data: event.payload }

      this.bus.publish({
        id: crypto.randomUUID(),
        type: `game.${event.type}`,
        timestamp: new Date(),
        payload: eventPayload,
      })
    }
  }

  publishGameFinished(gameId: string, winnerId: string | null): void {
    this.bus.publish({
      id: crypto.randomUUID(),
      type: 'game.finished',
      timestamp: new Date(),
      payload: {
        gameId,
        winnerId,
      },
    })
  }

  publishSessionEnded(gameId: string): void {
    this.bus.publish({
      id: crypto.randomUUID(),
      type: 'game.session_ended',
      timestamp: new Date(),
      payload: { gameId },
    })
  }
}
