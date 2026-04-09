import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invitation_codes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.uuid('uuid').notNullable().unique()
      table.string('code_digest', 128).notNullable().unique()
      table.string('issuer_user_uuid').notNullable()
      table.string('status').notNullable().defaultTo('active')
      table.timestamp('expires_at').nullable()
      table.integer('max_uses').notNullable().defaultTo(1)
      table.integer('used_count').notNullable().defaultTo(0)
      table.string('restricted_email').nullable()
      table.string('used_by_user_uuid').nullable()
      table.timestamp('used_at').nullable()
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.foreign('issuer_user_uuid').references('user_uuid').inTable('users').onDelete('CASCADE')
      table
        .foreign('used_by_user_uuid')
        .references('user_uuid')
        .inTable('users')
        .onDelete('SET NULL')

      table.index(['issuer_user_uuid'])
      table.index(['status'])
      table.index(['expires_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
