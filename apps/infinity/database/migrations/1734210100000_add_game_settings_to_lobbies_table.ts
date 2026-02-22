import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lobbies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('game_settings').notNullable().defaultTo('{}')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('game_settings')
    })
  }
}
