import type { GamePlugin, GameConfig, GameValidationResult } from '../../base/game_plugin.js'
import { GameValidation } from '../../base/game_plugin.js'

/**
 * État du jeu Tic-Tac-Toe
 */
export interface TicTacToeState {
  board: (string | null)[][] // 3x3 grid
  players: {
    X: string // UUID du joueur X
    O: string // UUID du joueur O
  }
  currentPlayer: 'X' | 'O'
  winner: string | null
  finished: boolean
  moves: number
}

/**
 * Action dans Tic-Tac-Toe
 */
export interface TicTacToeAction {
  type: 'place'
  row: number
  col: number
}

/**
 * Plugin Tic-Tac-Toe
 */
export class TicTacToePlugin implements GamePlugin<TicTacToeState, TicTacToeAction> {
  readonly id = 'tic-tac-toe'
  readonly name = 'Tic-Tac-Toe'
  readonly description = 'Le jeu classique du morpion'
  readonly version = '1.0.0'
  readonly minPlayers = 2
  readonly maxPlayers = 2
  readonly estimatedDuration = 5 // 5 minutes
  readonly tags = ['strategy', 'turn-based', 'quick-game']
  readonly defaultConfig: GameConfig = {
    turnTimeLimit: 30,
    allowSpectators: true,
  }

  initializeState(playerUuids: string[], _config?: Partial<GameConfig>): TicTacToeState {
    if (playerUuids.length !== 2) {
      throw new Error('Tic-Tac-Toe requires exactly 2 players')
    }

    return {
      board: [
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
      players: {
        X: playerUuids[0],
        O: playerUuids[1],
      },
      currentPlayer: 'X',
      winner: null,
      finished: false,
      moves: 0,
    }
  }

  validateAction(
    state: TicTacToeState,
    playerUuid: string,
    action: TicTacToeAction
  ): GameValidationResult {
    // Vérifier que c'est le tour du joueur
    const expectedPlayer = state.players[state.currentPlayer]
    if (playerUuid !== expectedPlayer) {
      return GameValidation.invalid('Not your turn', 'NOT_YOUR_TURN')
    }

    // Vérifier que le jeu n'est pas terminé
    if (state.finished) {
      return GameValidation.invalid('Game is finished', 'GAME_FINISHED')
    }

    // Vérifier que l'action est valide
    if (action.type !== 'place') {
      return GameValidation.invalid('Invalid action type', 'INVALID_ACTION')
    }

    // Vérifier les coordonnées
    if (action.row < 0 || action.row > 2 || action.col < 0 || action.col > 2) {
      return GameValidation.invalid('Invalid coordinates', 'INVALID_COORDINATES')
    }

    // Vérifier que la case est vide
    if (state.board[action.row][action.col] !== null) {
      return GameValidation.invalid('Cell already occupied', 'CELL_OCCUPIED')
    }

    return GameValidation.valid()
  }

  applyAction(state: TicTacToeState, _playerUuid: string, action: TicTacToeAction): TicTacToeState {
    // Créer une copie profonde du state
    const newBoard = state.board.map((row) => [...row])
    newBoard[action.row][action.col] = state.currentPlayer

    const newState: TicTacToeState = {
      ...state,
      board: newBoard,
      moves: state.moves + 1,
      currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    }

    // Vérifier s'il y a un gagnant
    const winner = this.checkWinner(newBoard)
    if (winner) {
      newState.winner = state.players[winner]
      newState.finished = true
    } else if (newState.moves === 9) {
      // Match nul
      newState.finished = true
    }

    return newState
  }

  isGameFinished(state: TicTacToeState): boolean {
    return state.finished
  }

  getWinner(state: TicTacToeState): string | null {
    return state.winner
  }

  getCurrentPlayer(state: TicTacToeState): string | null {
    if (state.finished) return null
    return state.players[state.currentPlayer]
  }

  getAvailableActions(state: TicTacToeState, _playerUuid: string): TicTacToeAction[] {
    if (state.finished) return []

    const actions: TicTacToeAction[] = []
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (state.board[row][col] === null) {
          actions.push({ type: 'place', row, col })
        }
      }
    }
    return actions
  }

  serializeState(state: TicTacToeState): string {
    return JSON.stringify(state)
  }

  deserializeState(serialized: string): TicTacToeState {
    return JSON.parse(serialized)
  }

  /**
   * Vérifie s'il y a un gagnant
   */
  private checkWinner(board: (string | null)[][]): 'X' | 'O' | null {
    // Lignes
    for (let row = 0; row < 3; row++) {
      if (board[row][0] && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
        return board[row][0] as 'X' | 'O'
      }
    }

    // Colonnes
    for (let col = 0; col < 3; col++) {
      if (board[0][col] && board[0][col] === board[1][col] && board[1][col] === board[2][col]) {
        return board[0][col] as 'X' | 'O'
      }
    }

    // Diagonales
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0] as 'X' | 'O'
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2] as 'X' | 'O'
    }

    return null
  }
}
