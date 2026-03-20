export class LobbyValidationException extends Error {
  readonly metadata: {
    userMessage: string
    field?: string
  }

  constructor(message: string, field?: string) {
    super(`Lobby validation failed: ${message}`)
    this.name = 'LobbyValidationException'
    this.metadata = {
      userMessage: message,
      field,
    }
  }
}
