import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lobbies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.uuid('uuid').notNullable().unique()
      table.string('name').notNullable()
      table.integer('max_players').notNullable()
      table.boolean('is_private').defaultTo(false)
      table.string('status').notNullable()
      table.string('created_by').notNullable()
      table.json('available_actions').defaultTo('[]')
      table.boolean('is_archived').defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')

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
