import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('username').nullable().unique()
      table.boolean('is_active').defaultTo(true).notNullable()
    })

    // Generate usernames from emails for existing users
    this.defer(async (db) => {
      const users = await db.from(this.tableName).select('id', 'email', 'username')

      for (const user of users) {
        if (!user.username) {
          const username = user.email.split('@')[0].toLowerCase()
          let finalUsername = username
          let counter = 1

          // Check if username exists and add counter if needed
          while (await db.from(this.tableName).where('username', finalUsername).first()) {
            finalUsername = `${username}${counter}`
            counter++
          }

          await db.from(this.tableName).where('id', user.id).update({ username: finalUsername })
        }
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('username')
      table.dropColumn('is_active')
    })
  }
}
