import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'friend_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.uuid('uuid').notNullable().unique()
      table.string('requester_user_uuid').notNullable()
      table.string('recipient_user_uuid').notNullable()
      table.string('pair_key').notNullable().unique()
      table.string('status').notNullable().defaultTo('pending')
      table.timestamp('responded_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table
        .foreign('requester_user_uuid')
        .references('user_uuid')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .foreign('recipient_user_uuid')
        .references('user_uuid')
        .inTable('users')
        .onDelete('CASCADE')

      table.index(['requester_user_uuid'])
      table.index(['recipient_user_uuid'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
