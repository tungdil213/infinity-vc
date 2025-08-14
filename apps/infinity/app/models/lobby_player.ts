import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import LobbyModel from './lobby_model.js'

export default class LobbyPlayer extends BaseModel {
  static table = 'lobby_players'

  @column({ isPrimary: true })
  declare uuid: string

  @column()
  declare lobbyId: number

  @column()
  declare userId: number

  @column.dateTime()
  declare joinedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => LobbyModel, {
    foreignKey: 'lobbyId',
    localKey: 'id',
  })
  declare lobby: BelongsTo<typeof LobbyModel>

  @belongsTo(() => User, {
    foreignKey: 'userId',
    localKey: 'id',
  })
  declare player: BelongsTo<typeof User>
}
