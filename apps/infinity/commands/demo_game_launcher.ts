import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

type DemoPlayer = { id: string; name: string; isActive: boolean }
type DemoAction = {
  type: string
  playerId: string
  payload: Record<string, unknown>
  timestamp: Date
}
type DemoGameState = {
  isFinished: boolean
  winnerId: string | null
  scores?: Record<string, number>
}

type DemoResult<T> = { isFailure: true; error: Error } | { isFailure: false; value: T }

type DemoLaunchedSession = {
  machine: { currentState: string }
  engine: {
    initialize: (
      players: DemoPlayer[],
      config: {
        gameType: string
        minPlayers: number
        maxPlayers: number
        settings: Record<string, unknown>
      }
    ) => DemoResult<DemoGameState>
    executeAction: (
      state: DemoGameState,
      action: DemoAction
    ) => DemoResult<{ newState: DemoGameState }>
  }
  definition: {
    metadata: { gameType: string; minPlayers: number; maxPlayers: number }
    playerConstraints: { minPlayers: number; maxPlayers: number }
  }
  settings: Record<string, unknown>
}

type DemoLauncher = {
  listGames: () => Array<{ id: string }>
  launch: (input: {
    gameId: string
    players: DemoPlayer[]
    settings: Record<string, unknown>
  }) => DemoResult<DemoLaunchedSession>
  startSession: (session: DemoLaunchedSession) => Promise<DemoResult<DemoLaunchedSession>>
}

const rpsSubmitMoveActionType = 'submit_move'

export default class DemoGameLauncher extends BaseCommand {
  static commandName = 'game:demo:rps'
  static description = 'Run a launcher-based Rock Paper Scissors demo game'

  static options: CommandOptions = {
    startApp: false,
  }

  async run() {
    const gameEngine = await import('@infinity.dev/game-engine')
    const createDefaultLauncher = (
      gameEngine as unknown as { createDefaultLauncher?: () => DemoLauncher }
    ).createDefaultLauncher

    if (!createDefaultLauncher) {
      this.logger.error('createDefaultLauncher is not exported by @infinity.dev/game-engine')
      this.logger.info('Run: yarn workspace @infinity.dev/game-engine build')
      return
    }

    const launcher = createDefaultLauncher()
    const games = launcher.listGames().map((game) => game.id)

    this.logger.info(`Registered games: ${games.join(', ')}`)

    const players: DemoPlayer[] = [
      { id: 'p1', name: 'Alice', isActive: true },
      { id: 'p2', name: 'Bob', isActive: true },
    ]

    const launched = launcher.launch({
      gameId: 'rock-paper-scissors',
      players,
      settings: { roundsToWin: 2, allowDrawReplay: true },
    })

    if (launched.isFailure) {
      this.logger.error(`Launch failed: ${launched.error.message}`)
      return
    }

    const started = await launcher.startSession(launched.value)
    if (started.isFailure) {
      this.logger.error(`Start failed: ${started.error.message}`)
      return
    }

    this.logger.success(`Launcher state: ${started.value.machine.currentState}`)

    const initResult = started.value.engine.initialize(players, {
      gameType: started.value.definition.metadata.gameType,
      minPlayers: started.value.definition.playerConstraints.minPlayers,
      maxPlayers: started.value.definition.playerConstraints.maxPlayers,
      settings: started.value.settings,
    })

    if (initResult.isFailure) {
      this.logger.error(`Engine init failed: ${initResult.error.message}`)
      return
    }

    let currentState: DemoGameState = initResult.value
    const scriptedRounds = [
      ['rock', 'scissors'],
      ['paper', 'rock'],
    ] as const

    for (const [firstMove, secondMove] of scriptedRounds) {
      const p1Action: DemoAction = {
        type: rpsSubmitMoveActionType,
        playerId: 'p1',
        payload: { move: firstMove },
        timestamp: new Date(),
      }

      const p1Result = started.value.engine.executeAction(currentState, p1Action)
      if (p1Result.isFailure) {
        this.logger.error(`P1 action failed: ${p1Result.error.message}`)
        return
      }

      currentState = p1Result.value.newState

      const p2Action: DemoAction = {
        type: rpsSubmitMoveActionType,
        playerId: 'p2',
        payload: { move: secondMove },
        timestamp: new Date(),
      }

      const p2Result = started.value.engine.executeAction(currentState, p2Action)
      if (p2Result.isFailure) {
        this.logger.error(`P2 action failed: ${p2Result.error.message}`)
        return
      }

      currentState = p2Result.value.newState
    }

    this.logStateSummary(currentState)
  }

  private logStateSummary(state: DemoGameState) {
    this.logger.success('Demo game finished')
    this.logger.info(`isFinished: ${state.isFinished}`)
    this.logger.info(`winnerId: ${state.winnerId ?? 'none'}`)

    if (state.scores) {
      this.logger.info(`scores: ${JSON.stringify(state.scores)}`)
    }
  }
}
