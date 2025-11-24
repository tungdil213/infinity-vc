import type { Result } from '../domain/result.js'

/**
 * Command Interface (CQRS Write)
 * Modifie l'état du système
 */
export interface Command {}

export interface CommandHandler<TCommand extends Command, TResponse> {
  handle(command: TCommand): Promise<Result<TResponse>>
}
