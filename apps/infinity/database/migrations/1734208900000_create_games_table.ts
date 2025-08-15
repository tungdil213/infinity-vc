import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'games'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('uuid').primary()
      table.string('status').notNullable().defaultTo('IN_PROGRESS')
      table.json('players').notNullable()
      table.json('game_data').notNullable()
      table.uuid('winner_uuid').nullable()
      table.timestamp('started_at').notNullable()
      table.timestamp('finished_at').nullable()
      table.integer('duration_ms').nullable()
      table.boolean('deleted_at').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['status', 'deleted_at'])
      table.index(['started_at'])
      table.index(['winner_uuid'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
