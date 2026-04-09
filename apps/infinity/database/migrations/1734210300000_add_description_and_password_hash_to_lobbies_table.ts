import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lobbies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('description', 255).nullable()
      table.string('password_hash').nullable()
      table.index(['password_hash'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['password_hash'])
      table.dropColumn('password_hash')
      table.dropColumn('description')
    })
  }
}
