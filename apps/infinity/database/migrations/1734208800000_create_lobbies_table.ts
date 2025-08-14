import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lobbies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('uuid').primary()
      table.string('name').notNullable()
      table.integer('max_players').notNullable().defaultTo(4)
      table.boolean('is_private').notNullable().defaultTo(false)
      table.string('status').notNullable().defaultTo('WAITING')
      table.uuid('created_by').notNullable()
      table.json('players').notNullable().defaultTo('[]')
      table.json('available_actions').notNullable().defaultTo('[]')
      table.boolean('is_archived').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['status', 'is_archived'])
      table.index(['created_by'])
      table.index(['is_private', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
