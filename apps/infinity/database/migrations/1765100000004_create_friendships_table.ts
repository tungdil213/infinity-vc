import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'friendships'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.uuid('uuid').notNullable().unique()
      table.string('user_a_uuid').notNullable()
      table.string('user_b_uuid').notNullable()
      table.string('pair_key').notNullable().unique()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.foreign('user_a_uuid').references('user_uuid').inTable('users').onDelete('CASCADE')
      table.foreign('user_b_uuid').references('user_uuid').inTable('users').onDelete('CASCADE')

      table.index(['user_a_uuid'])
      table.index(['user_b_uuid'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
