export interface OperationResult<T = any> {
  success: boolean
  error?: string
  data?: T
}

export interface LobbyOperationResult extends OperationResult {
  lobby?: any
  lobbyDeleted?: boolean
}

export interface GameOperationResult extends OperationResult {
  game?: any
}

export class OperationResultFactory {
  static success<T>(data?: T): OperationResult<T> {
    return {
      success: true,
      data,
    }
  }

  static failure(error: string): OperationResult {
    return {
      success: false,
      error,
    }
  }

  static lobbySuccess(lobby: any, lobbyDeleted = false): LobbyOperationResult {
    return {
      success: true,
      lobby,
      lobbyDeleted,
    }
  }

  static lobbyFailure(error: string): LobbyOperationResult {
    return {
      success: false,
      error,
    }
  }

  static gameSuccess(game: any): GameOperationResult {
    return {
      success: true,
      game,
    }
  }

  static gameFailure(error: string): GameOperationResult {
    return {
      success: false,
      error,
    }
  }
}
