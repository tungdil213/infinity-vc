export enum LobbyStatus {
  WAITING = 'waiting',
  READY = 'ready',
  FULL = 'full',
  STARTING = 'starting',
  IN_GAME = 'in_game',
  PAUSED = 'paused',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export class LobbyStatusTransitions {
  private static validTransitions: Map<LobbyStatus, LobbyStatus[]> = new Map([
    [LobbyStatus.WAITING, [LobbyStatus.READY, LobbyStatus.FULL, LobbyStatus.CANCELLED]],
    [LobbyStatus.READY, [LobbyStatus.WAITING, LobbyStatus.STARTING, LobbyStatus.CANCELLED]],
    [LobbyStatus.FULL, [LobbyStatus.READY, LobbyStatus.STARTING, LobbyStatus.CANCELLED]],
    [LobbyStatus.STARTING, [LobbyStatus.IN_GAME, LobbyStatus.CANCELLED]],
    [LobbyStatus.IN_GAME, [LobbyStatus.PAUSED, LobbyStatus.FINISHED]],
    [LobbyStatus.PAUSED, [LobbyStatus.IN_GAME, LobbyStatus.FINISHED]],
    [LobbyStatus.FINISHED, []],
    [LobbyStatus.CANCELLED, []],
  ])

  public static canTransition(from: LobbyStatus, to: LobbyStatus): boolean {
    const validTargets = this.validTransitions.get(from) || []
    return validTargets.includes(to)
  }
}
