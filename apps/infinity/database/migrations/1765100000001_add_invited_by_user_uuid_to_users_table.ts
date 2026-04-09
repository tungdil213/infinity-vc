import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('invited_by_user_uuid').nullable()
      table
        .foreign('invited_by_user_uuid')
        .references('user_uuid')
        .inTable('users')
        .onDelete('SET NULL')
      table.index(['invited_by_user_uuid'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['invited_by_user_uuid'])
      table.dropForeign(['invited_by_user_uuid'])
      table.dropColumn('invited_by_user_uuid')
    })
  }
}
