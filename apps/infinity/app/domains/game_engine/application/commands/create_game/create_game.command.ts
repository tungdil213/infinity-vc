import type { Command } from '#shared_kernel/application/command.interface'

export class CreateGameCommand implements Command {
  constructor(
    public readonly lobbyId: string,
    public readonly gameType: string,
    public readonly playerIds: string[]
  ) {}
}
