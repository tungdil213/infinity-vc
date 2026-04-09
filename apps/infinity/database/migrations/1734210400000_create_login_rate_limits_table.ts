import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'login_rate_limits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('identifier').primary()
      table.integer('attempt_count').notNullable().defaultTo(0)
      table.bigInteger('first_attempt_at_ms').notNullable()
      table.bigInteger('blocked_until_ms').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
