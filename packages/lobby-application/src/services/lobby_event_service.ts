export interface LobbyEventService {
  emitLobbyDeleted(lobbyUuid: string, reason?: string): Promise<void>

  emitLobbyModerationClosed(args: {
    lobbyUuid: string
    reason: string
    closedByUserUuid: string
    closedByRole: string
  }): Promise<void>
}
