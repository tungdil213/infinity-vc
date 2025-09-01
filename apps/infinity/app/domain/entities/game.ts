import { BaseEntity } from './base_entity.js'
import { GameStatus } from '../value_objects/game_status.js'
import { PlayerInterface } from '../interfaces/player_interface.js'
import { GameStateException } from '../../exceptions/domain_exceptions.js'

export interface GameData {
  uuid?: string
  players: PlayerInterface[]
  gameData?: any
}

export interface GameStateData {
  currentRound: number
  currentTurn: number
  eliminatedPlayers: string[]
  playerHands: Record<string, any[]>
  discardPile: any[]
  winner?: string
  deck: {
    remaining: number
  }
}

export default class Game extends BaseEntity {
  private constructor(
    private _uuid: string,
    private _status: GameStatus,
    private _players: PlayerInterface[],
    private _gameData: GameStateData,
    private _startedAt: Date,
    private _finishedAt?: Date
  ) {
    super()
  }

  static create(data: GameData): Game {
    const uuid = data.uuid || crypto.randomUUID()

    // Validation
    Game.validatePlayers(data.players)

    // Initialisation de l'état de jeu
    const initialGameData: GameStateData = {
      currentRound: 1,
      currentTurn: 0,
      deck: {
        remaining: 16, // Love Letter deck size
      },
      discardPile: [],
      playerHands: {},
      eliminatedPlayers: [],
    }

    // Initialiser les mains des joueurs
    data.players.forEach((player) => {
      initialGameData.playerHands[player.uuid] = []
    })

    return new Game(
      uuid,
      GameStatus.IN_PROGRESS,
      [...data.players],
      data.gameData || initialGameData,
      new Date()
    )
  }

  static reconstitute(
    uuid: string,
    status: GameStatus,
    players: PlayerInterface[],
    gameData: GameStateData,
    startedAt: Date,
    finishedAt?: Date
  ): Game {
    return new Game(uuid, status, players, gameData, startedAt, finishedAt)
  }

  // Getters
  get uuid(): string {
    return this._uuid
  }

  get status(): GameStatus {
    return this._status
  }

  get players(): PlayerInterface[] {
    return [...this._players]
  }

  get gameData(): GameStateData {
    return { ...this._gameData }
  }

  get startedAt(): Date {
    return this._startedAt
  }

  get finishedAt(): Date | undefined {
    return this._finishedAt
  }

  get duration(): number {
    const endTime = this._finishedAt || new Date()
    return endTime.getTime() - this._startedAt.getTime()
  }

  get isFinished(): boolean {
    return this._status === GameStatus.FINISHED
  }

  get currentPlayer(): PlayerInterface | undefined {
    if (this._gameData.currentTurn >= this._players.length) {
      return undefined
    }
    return this._players[this._gameData.currentTurn]
  }

  get activePlayers(): PlayerInterface[] {
    return this._players.filter((p) => !this._gameData.eliminatedPlayers.includes(p.uuid))
  }

  // Methods
  pauseGame(): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new GameStateException('Can only pause a game in progress', this._status)
    }
    this._status = GameStatus.PAUSED
  }

  resumeGame(): void {
    if (this._status !== GameStatus.PAUSED) {
      throw new GameStateException('Can only resume a paused game', this._status)
    }
    this._status = GameStatus.IN_PROGRESS
  }

  finishGame(winnerUuid?: string): void {
    if (this._status === GameStatus.FINISHED) {
      throw new GameStateException('Game is already finished', this._status)
    }

    this._status = GameStatus.FINISHED
    this._finishedAt = new Date()

    if (winnerUuid) {
      this._gameData = {
        ...this._gameData,
        winner: winnerUuid,
      }
    }
  }

  eliminatePlayer(playerUuid: string): void {
    if (!this.hasPlayer(playerUuid)) {
      throw new GameStateException('Player not in game')
    }

    if (!this._gameData.eliminatedPlayers.includes(playerUuid)) {
      this._gameData.eliminatedPlayers.push(playerUuid)
    }

    // Vérifier si la partie est terminée (un seul joueur restant)
    if (this.activePlayers.length <= 1) {
      const winner = this.activePlayers[0]
      this.finishGame(winner?.uuid)
    }
  }

  nextTurn(): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new GameStateException('Cannot advance turn when game is not in progress', this._status)
    }

    this._gameData.currentTurn = (this._gameData.currentTurn + 1) % this.activePlayers.length
  }

  nextRound(): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new GameStateException('Cannot advance round when game is not in progress', this._status)
    }

    this._gameData.currentRound += 1
    this._gameData.currentTurn = 0
    this._gameData.discardPile = []

    // Réinitialiser les mains des joueurs
    this.activePlayers.forEach((player) => {
      this._gameData.playerHands[player.uuid] = []
    })
  }

  updateGameData(newGameData: Partial<GameStateData>): void {
    this._gameData = {
      ...this._gameData,
      ...newGameData,
    }
  }

  // Utility methods
  hasPlayer(playerUuid: string): boolean {
    return this._players.some((p) => p.uuid === playerUuid)
  }

  isPlayerEliminated(playerUuid: string): boolean {
    return this._gameData.eliminatedPlayers.includes(playerUuid)
  }

  isPlayerTurn(playerUuid: string): boolean {
    const currentPlayer = this.currentPlayer
    return currentPlayer?.uuid === playerUuid
  }

  canPlayerPlay(playerUuid: string): boolean {
    return (
      this._status === GameStatus.IN_PROGRESS &&
      this.isPlayerTurn(playerUuid) &&
      !this.isPlayerEliminated(playerUuid)
    )
  }

  // Validation
  private static validatePlayers(players: PlayerInterface[]): void {
    if (!players || players.length < 2) {
      throw new GameStateException('Game must have at least 2 players')
    }
    if (players.length > 4) {
      throw new GameStateException('Game cannot have more than 4 players')
    }

    // Vérifier les doublons
    const uniqueUuids = new Set(players.map((p) => p.uuid))
    if (uniqueUuids.size !== players.length) {
      throw new GameStateException('Duplicate players not allowed')
    }
  }

  // Serialization
  toJSON() {
    return {
      uuid: this._uuid,
      status: this._status,
      players: this._players,
      gameData: this._gameData,
      startedAt: this._startedAt,
      finishedAt: this._finishedAt,
      duration: this.duration,
      isFinished: this.isFinished,
      currentPlayer: this.currentPlayer,
      activePlayers: this.activePlayers,
    }
  }
}
