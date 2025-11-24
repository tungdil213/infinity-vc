import type { Command } from '#shared_kernel/application/command.interface'

export class RegisterUserCommand implements Command {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly username: string,
    public readonly fullName?: string
  ) {}
}
