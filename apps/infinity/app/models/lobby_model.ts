import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class LobbyModel extends BaseModel {
  public static table = 'lobbies'

  @column({ isPrimary: true })
  declare uuid: string

  @column()
  declare name: string

  @column()
  declare maxPlayers: number

  @column()
  declare isPrivate: boolean

  @column()
  declare status: string

  @column()
  declare createdBy: string

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
  declare availableActions: string[]

  @column()
  declare isArchived: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
