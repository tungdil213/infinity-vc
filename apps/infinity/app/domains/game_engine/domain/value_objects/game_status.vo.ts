export enum GameStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class GameStatusTransitions {
  private static validTransitions: Map<GameStatus, GameStatus[]> = new Map([
    [GameStatus.CREATED, [GameStatus.IN_PROGRESS, GameStatus.CANCELLED]],
    [GameStatus.IN_PROGRESS, [GameStatus.PAUSED, GameStatus.COMPLETED, GameStatus.CANCELLED]],
    [GameStatus.PAUSED, [GameStatus.IN_PROGRESS, GameStatus.CANCELLED]],
    [GameStatus.COMPLETED, []],
    [GameStatus.CANCELLED, []],
  ])

  public static canTransition(from: GameStatus, to: GameStatus): boolean {
    const validTargets = this.validTransitions.get(from) || []
    return validTargets.includes(to)
  }
}
