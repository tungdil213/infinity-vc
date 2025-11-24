import type { Command } from '#shared_kernel/application/command.interface'

export class AuthenticateUserCommand implements Command {
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {}
}
