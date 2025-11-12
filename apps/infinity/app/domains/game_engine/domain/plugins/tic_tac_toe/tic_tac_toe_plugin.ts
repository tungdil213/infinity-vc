import type { GamePlugin } from '../game_plugin.interface.js'
import { Result } from '#shared_kernel/domain/result'
import { GameState } from '../../value_objects/game_state.vo.js'

interface TicTacToeState {
  board: (string | null)[][]
  currentPlayer: string
}

export class TicTacToePlugin implements GamePlugin {
  readonly name = 'tic-tac-toe'
  readonly version = '1.0.0'
  readonly minPlayers = 2
  readonly maxPlayers = 2

  initialize(playerIds: string[]): Result<GameState> {
    const board: (string | null)[][] = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]

    const data: TicTacToeState = {
      board,
      currentPlayer: playerIds[0],
    }

    return GameState.create({
      data,
      currentPlayerIndex: 0,
      turnNumber: 1,
    })
  }

  validateMove(state: GameState, playerId: string, move: any): Result<boolean> {
    const { row, col } = move

    if (typeof row !== 'number' || typeof col !== 'number') {
      return Result.fail('Invalid move format')
    }

    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return Result.fail('Move out of bounds')
    }

    const data = state.data as TicTacToeState

    if (data.board[row][col] !== null) {
      return Result.fail('Cell already occupied')
    }

    if (data.currentPlayer !== playerId) {
      return Result.fail('Not your turn')
    }

    return Result.ok(true)
  }

  applyMove(state: GameState, playerId: string, move: any): Result<GameState> {
    const { row, col } = move
    const data = state.data as TicTacToeState

    const newBoard = data.board.map((r) => [...r])
    const playerIndex = state.currentPlayerIndex
    const symbol = playerIndex === 0 ? 'X' : 'O'

    newBoard[row][col] = symbol

    const nextPlayerIndex = playerIndex === 0 ? 1 : 0

    const newData: TicTacToeState = {
      board: newBoard,
      currentPlayer: state.currentPlayerIndex === 0 ? playerId : playerId,
    }

    return Result.ok(state.withData(newData).nextTurn(nextPlayerIndex))
  }

  isGameFinished(state: GameState): boolean {
    const data = state.data as TicTacToeState
    const board = data.board

    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return true
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
        return true
      }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return true
    }

    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return true
    }

    // Check draw (board full)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i][j] === null) {
          return false
        }
      }
    }

    return true
  }

  getWinner(state: GameState): string | null {
    const data = state.data as TicTacToeState
    const board = data.board

    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return board[i][0] === 'X' ? state.currentPlayerId : state.currentPlayerId
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
        return board[0][i] === 'X' ? state.currentPlayerId : state.currentPlayerId
      }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0] === 'X' ? state.currentPlayerId : state.currentPlayerId
    }

    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2] === 'X' ? state.currentPlayerId : state.currentPlayerId
    }

    return null
  }
}
