import type { PlayerInterface } from '@infinity.dev/lobby-domain/interfaces'

export interface LobbyNotifier {
  notifyLobbyCreated(lobbyUuid: string, lobby: unknown): void

  notifyPlayerJoined(lobbyUuid: string, player: PlayerInterface, lobby: unknown): void

  notifyPlayerLeft(lobbyUuid: string, player: PlayerInterface, lobby: unknown): void

  notifyGameStarted?(lobbyUuid: string, gameUuid: string, lobby: unknown): Promise<void> | void
}
