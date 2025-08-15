import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'players'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('player_uuid').notNullable().unique()
      table.string('user_uuid').notNullable()
      table.string('nick_name').notNullable()
      table.string('avatar_url').nullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Foreign key constraint
      table.foreign('user_uuid').references('user_uuid').inTable('users').onDelete('CASCADE')

      // Indexes
      table.index('user_uuid')
      table.index('nick_name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
