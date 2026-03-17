import type { GameSession } from '#application/services/game_engine_types'

export class GameSessionStore {
  private sessions = new Map<string, GameSession>()

  save(session: GameSession): void {
    this.sessions.set(session.gameId, session)
  }

  get(gameId: string): GameSession | undefined {
    return this.sessions.get(gameId)
  }

  updateState(gameId: string, state: GameSession['state']): GameSession | undefined {
    const session = this.sessions.get(gameId)
    if (!session) return undefined

    session.state = state
    this.sessions.set(gameId, session)
    return session
  }

  delete(gameId: string): GameSession | undefined {
    const session = this.sessions.get(gameId)
    if (!session) return undefined

    this.sessions.delete(gameId)
    return session
  }

  list(): GameSession[] {
    return Array.from(this.sessions.values())
  }

  getByLobbyId(lobbyId: string): GameSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.lobbyId === lobbyId) {
        return session
      }
    }

    return undefined
  }
}
