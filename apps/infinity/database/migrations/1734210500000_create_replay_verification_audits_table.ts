import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'replay_verification_audits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('operation').notNullable()
      table.string('source').notNullable()
      table.string('actor_id').notNullable()
      table.string('target_id').notNullable()
      table.boolean('accepted').notNullable().defaultTo(false)
      table.string('reason').nullable()
      table.string('envelope_key_id').nullable()
      table.string('envelope_algorithm').nullable()
      table.string('envelope_signed_at').nullable()
      table.json('metadata').nullable()
      table.timestamp('created_at').notNullable()

      table.index(['operation', 'source'])
      table.index(['actor_id'])
      table.index(['target_id'])
      table.index(['accepted', 'reason'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
