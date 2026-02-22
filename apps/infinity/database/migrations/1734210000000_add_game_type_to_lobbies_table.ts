import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lobbies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('game_type').notNullable().defaultTo('love-letter')
      table.index(['game_type'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['game_type'])
      table.dropColumn('game_type')
    })
  }
}
