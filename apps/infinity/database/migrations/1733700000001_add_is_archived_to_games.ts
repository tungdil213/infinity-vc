import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Legacy migration now turned into a no-op.
 *
 * The `is_archived` column is defined directly in
 * 1734208900000_create_games_table.ts, so this migration
 * must not try to alter the table (it may not exist yet
 * during `migration:fresh`).
 */
export default class extends BaseSchema {
  protected tableName = 'games'

  async up() {
    // No-op
  }

  async down() {
    // No-op
  }
}
