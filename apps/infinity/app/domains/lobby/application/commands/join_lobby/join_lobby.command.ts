import type { Command } from '#shared_kernel/application/command.interface'

export class JoinLobbyCommand implements Command {
  constructor(
    public readonly lobbyId: string,
    public readonly userId: string,
    public readonly username: string
  ) {}
}
