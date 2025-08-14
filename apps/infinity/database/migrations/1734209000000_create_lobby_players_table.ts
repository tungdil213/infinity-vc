import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lobby_players'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('uuid').primary()
      table.integer('lobby_id').notNullable()
      table.integer('user_id').notNullable()
      table.timestamp('joined_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Foreign keys
      table.foreign('lobby_id').references('id').inTable('lobbies').onDelete('CASCADE')
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')

      // Unique constraint to prevent duplicate entries
      table.unique(['lobby_id', 'user_id'])

      // Indexes for performance
      table.index(['lobby_id'])
      table.index(['user_id'])
      table.index(['joined_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
