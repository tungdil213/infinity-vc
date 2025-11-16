import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'

export default class CheckUser extends BaseCommand {
  static commandName = 'check:user'
  static description = 'Vérifier si un utilisateur existe en base'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: "Email de l'utilisateur" })
  declare email: string

  async run() {
    const email = this.email || 'eric@structo.ch'

    this.logger.info(`🔍 Recherche de l'utilisateur: ${email}`)

    const user = await User.findBy('email', email)

    if (!user) {
      this.logger.error(`❌ Utilisateur NON trouvé: ${email}`)
      this.logger.info('💡 Exécute: node ace db:seed --files database/seeders/dev_user_seeder.ts')
      return
    }

    this.logger.success(`✅ Utilisateur trouvé!`)
    this.logger.info(`   ID: ${user.id}`)
    this.logger.info(`   UUID: ${user.userUuid}`)
    this.logger.info(`   Email: ${user.email}`)
    this.logger.info(`   Username: ${user.username}`)
    this.logger.info(`   Full Name: ${user.fullName}`)
    this.logger.info(`   Is Active: ${user.isActive}`)
    this.logger.info(`   Password Hash: ${user.password.substring(0, 20)}...`)
    this.logger.info(`   Created: ${user.createdAt}`)
  }
}
