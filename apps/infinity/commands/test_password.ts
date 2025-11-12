import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class TestPassword extends BaseCommand {
  static commandName = 'test:password'
  static description = 'Tester la vérification du mot de passe'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: "Email de l'utilisateur" })
  declare email: string

  @args.string({ description: 'Mot de passe à tester' })
  declare password: string

  async run() {
    const email = this.email || 'eric@structo.ch'
    const password = this.password || 'password'

    this.logger.info(`🔐 Test du password pour: ${email}`)
    this.logger.info(`   Password testé: "${password}"`)

    const user = await User.findBy('email', email)

    if (!user) {
      this.logger.error(`❌ Utilisateur non trouvé: ${email}`)
      return
    }

    this.logger.info(`📦 Utilisateur trouvé:`)
    this.logger.info(`   Hash stocké: ${user.password}`)

    // Test de vérification
    const isValid = await hash.verify(user.password, password)

    if (isValid) {
      this.logger.success(`✅ PASSWORD VALIDE !`)
      this.logger.info(`   Le hash correspond au password "${password}"`)
    } else {
      this.logger.error(`❌ PASSWORD INVALIDE !`)
      this.logger.info(`   Le hash NE correspond PAS au password "${password}"`)
      this.logger.info(`   💡 Essaie: node ace reset:user ${email}`)
    }
  }
}
