import type { Command } from '#shared_kernel/application/command.interface'

export class CreateLobbyCommand implements Command {
  constructor(
    public readonly ownerId: string,
    public readonly ownerName: string,
    public readonly name: string,
    public readonly maxPlayers: number,
    public readonly minPlayers: number,
    public readonly isPrivate: boolean,
    public readonly gameType: string
  ) {}
}
