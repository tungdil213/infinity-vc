import type { Command } from '#shared_kernel/application/command.interface'

export class PlayMoveCommand implements Command {
  constructor(
    public readonly gameId: string,
    public readonly playerId: string,
    public readonly move: any
  ) {}
}
