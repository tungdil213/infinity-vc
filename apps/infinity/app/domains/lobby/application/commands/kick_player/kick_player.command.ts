import type { Command } from '#shared_kernel/application/command.interface'

export class KickPlayerCommand implements Command {
  constructor(
    public readonly lobbyId: string,
    public readonly kickerId: string,
    public readonly targetUserId: string
  ) {}
}
