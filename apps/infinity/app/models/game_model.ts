import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class GameModel extends BaseModel {
  public static table = 'games'

  @column({ isPrimary: true })
  declare uuid: string

  @column()
  declare status: string

  @column({
    serialize: (value: string) => {
      return JSON.parse(value)
    },
    prepare: (value: any) => {
      return JSON.stringify(value)
    },
  })
  declare players: any[]

  @column({
    serialize: (value: string) => {
      return JSON.parse(value)
    },
    prepare: (value: any) => {
      return JSON.stringify(value)
    },
  })
  declare gameData: any

  @column()
  declare winnerUuid: string | null

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare finishedAt: DateTime | null

  @column()
  declare durationMs: number | null

  @column()
  declare isArchived: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
