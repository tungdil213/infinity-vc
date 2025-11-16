import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lobby_players'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Primary key - Integer (internal)
      table.increments('id').primary()

      // Player info
      table.integer('user_id').unsigned().notNullable()
      table.string('username').notNullable()
      table.integer('lobby_id').unsigned().notNullable()
      table.boolean('is_ready').defaultTo(false)
      table.boolean('is_owner').defaultTo(false)

      // Timestamps
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // Foreign keys
      table.foreign('lobby_id').references('id').inTable('lobbies').onDelete('CASCADE')
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')

      // Unique constraint to prevent duplicate entries
      table.unique(['lobby_id', 'user_id'])

      // Indexes for performance
      table.index(['lobby_id'])
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
