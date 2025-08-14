import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class ResetUserPasswords extends BaseCommand {
  static commandName = 'reset:passwords'
  static description = 'Reset user passwords to fix double hashing issue'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Starting password reset for all users...')

    try {
      // Get all users
      const users = await User.all()
      
      if (users.length === 0) {
        this.logger.info('No users found in database')
        return
      }

      this.logger.info(`Found ${users.length} users to update`)

      // Reset each user's password to a temporary password
      const tempPassword = 'TempPass123!'
      
      for (const user of users) {
        // Update password directly in database to avoid double hashing
        await user.merge({ password: await hash.make(tempPassword) }).save()
        
        this.logger.info(`✅ Reset password for user: ${user.email} (${user.fullName})`)
        this.logger.info(`   Temporary password: ${tempPassword}`)
      }

      this.logger.success(`Successfully reset passwords for ${users.length} users`)
      this.logger.info(`All users can now login with password: ${tempPassword}`)
      this.logger.warning('Users should change their passwords after logging in')

    } catch (error) {
      this.logger.error('Failed to reset passwords:', error)
      throw error
    }
  }
}
