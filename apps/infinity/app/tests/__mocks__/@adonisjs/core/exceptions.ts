// Mock for @adonisjs/core/exceptions
export class Exception extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'Exception'
  }
}

export function createError(message: string, status?: number, code?: string) {
  return new Exception(message, status, code)
}

export class RuntimeException extends Exception {}
export class InvalidArgumentsException extends Exception {}
