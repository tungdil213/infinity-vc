import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lobbies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Primary key - Integer (internal)
      table.increments('id').primary()
      
      // Public UUID (for API/frontend)
      table.uuid('uuid').notNullable().unique()
      
      // Lobby info
      table.integer('owner_id').unsigned().notNullable()
      table.string('name').notNullable()
      table.integer('max_players').notNullable().defaultTo(4)
      table.integer('min_players').notNullable().defaultTo(2)
      table.boolean('is_private').defaultTo(false)
      table.string('game_type').notNullable()
      table.string('status').notNullable().defaultTo('waiting')
      
      // Optional fields
      table.string('invitation_code', 20).nullable()
      table.string('game_id', 36).nullable()
      
      // Timestamps
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // Foreign keys
      table.foreign('owner_id').references('id').inTable('users').onDelete('CASCADE')
      
      // Indexes
      table.index(['uuid'])
      table.index(['status'])
      table.index(['owner_id'])
      table.index(['is_private', 'status'])
      table.index(['invitation_code'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
