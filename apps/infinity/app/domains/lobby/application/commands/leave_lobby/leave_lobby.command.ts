import type { Command } from '#shared_kernel/application/command.interface'

export class LeaveLobbyCommand implements Command {
  constructor(
    public readonly lobbyId: string,
    public readonly userId: string
  ) {}
}
