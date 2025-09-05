import { BaseEntity } from './base_entity.js'
import { PlayerInterface, PlayerWithStatsInterface } from '../interfaces/player_interface.js'
import { PlayerValidationException } from '../../exceptions/domain_exceptions.js'

export interface PlayerData {
  uuid?: string
  userUuid: string
  nickName: string
  gamesPlayed?: number
  gamesWon?: number
  createdAt?: Date
}

export default class Player extends BaseEntity implements PlayerInterface {
  private constructor(
    private _uuid: string,
    private _userUuid: string,
    private _nickName: string,
    private _gamesPlayed: number = 0,
    private _gamesWon: number = 0,
    private _createdAt: Date = new Date()
  ) {
    super()
  }

  static create(data: PlayerData): Player {
    const uuid = data.uuid || crypto.randomUUID()

    // Validation
    Player.validateUserUuid(data.userUuid)
    Player.validateNickName(data.nickName)
    Player.validateStats(data.gamesPlayed || 0, data.gamesWon || 0)

    return new Player(
      uuid,
      data.userUuid,
      data.nickName.trim(),
      data.gamesPlayed || 0,
      data.gamesWon || 0,
      data.createdAt || new Date()
    )
  }

  static reconstitute(
    uuid: string,
    userUuid: string,
    nickName: string,
    gamesPlayed: number = 0,
    gamesWon: number = 0,
    createdAt?: Date
  ): Player {
    return new Player(uuid, userUuid, nickName, gamesPlayed, gamesWon, createdAt || new Date())
  }

  // Getters (PlayerInterface)
  get uuid(): string {
    return this._uuid
  }

  get userUuid(): string {
    return this._userUuid
  }

  get nickName(): string {
    return this._nickName
  }

  get gamesPlayed(): number {
    return this._gamesPlayed
  }

  get gamesWon(): number {
    return this._gamesWon
  }

  get winRate(): number {
    return this._gamesPlayed === 0 ? 0 : this._gamesWon / this._gamesPlayed
  }

  get createdAt(): Date {
    return this._createdAt
  }

  // Methods
  updateNickName(newNickName: string): void {
    Player.validateNickName(newNickName)
    this._nickName = newNickName.trim()
  }

  recordGameWin(): void {
    this._gamesPlayed++
    this._gamesWon++
  }

  recordGameLoss(): void {
    this._gamesPlayed++
  }

  recordGamePlayed(won: boolean): void {
    this._gamesPlayed += 1
    if (won) {
      this._gamesWon += 1
    }
  }

  // Validation
  private static validateUserUuid(userUuid: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userUuid)) {
      throw new PlayerValidationException('Invalid user UUID format', 'userUuid')
    }
  }

  private static validateNickName(nickName: string): void {
    if (!nickName || nickName.trim().length === 0) {
      throw new PlayerValidationException('Nickname cannot be empty', 'nickName')
    }
    if (nickName.trim().length < 3 || nickName.trim().length > 30) {
      throw new PlayerValidationException(
        'Nickname must be between 3 and 30 characters',
        'nickName'
      )
    }
    if (!/^[a-zA-Z0-9\s_-]+$/.test(nickName.trim())) {
      throw new PlayerValidationException(
        'Nickname can only contain letters, numbers, spaces, underscores and hyphens',
        'nickName'
      )
    }
  }

  private static validateStats(gamesPlayed: number, gamesWon: number): void {
    if (gamesPlayed < 0) {
      throw new PlayerValidationException('Games played cannot be negative', 'gamesPlayed')
    }
    if (gamesWon < 0) {
      throw new PlayerValidationException('Games won cannot be negative', 'gamesWon')
    }
    if (gamesWon > gamesPlayed) {
      throw new PlayerValidationException('Games won cannot exceed games played', 'gamesWon')
    }
  }

  // Interface implementations
  toPlayerInterface(): PlayerInterface {
    return {
      uuid: this._uuid,
      nickName: this._nickName,
    }
  }

  toPlayerWithStatsInterface(): PlayerWithStatsInterface {
    return {
      uuid: this._userUuid,
      nickName: this._nickName,
      gamesPlayed: this._gamesPlayed,
      gamesWon: this._gamesWon,
      winRate: this.winRate,
    }
  }

  // Serialization
  toJSON() {
    return {
      uuid: this._uuid,
      userUuid: this._userUuid,
      nickName: this._nickName,
      gamesPlayed: this._gamesPlayed,
      gamesWon: this._gamesWon,
      winRate: this.winRate,
      createdAt: this._createdAt,
    }
  }
}
