import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class GameModel extends BaseModel {
  public static table = 'games'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare lobbyId: string

  @column()
  declare gameType: string

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare playerIds: string[]

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare state: any

  @column()
  declare status: string

  @column()
  declare winnerId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
