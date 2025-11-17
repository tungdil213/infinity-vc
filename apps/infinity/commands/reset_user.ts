import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import UserModel from '#domains/iam/infrastructure/persistence/user.model'
import hash from '@adonisjs/core/services/hash'
import { randomUUID } from 'node:crypto'

export default class ResetUser extends BaseCommand {
  static commandName = 'reset:user'
  static description = 'Supprimer et recréer un utilisateur avec un nouveau password'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: "Email de l'utilisateur" })
  declare email: string

  async run() {
    const email = this.email || 'eric@structo.ch'
    const password = 'password'

    this.logger.info(`🔄 Reset de l'utilisateur: ${email}`)

    // 1. Supprimer l'ancien utilisateur
    const existingUser = await UserModel.findBy('email', email)
    if (existingUser) {
      await existingUser.delete()
      this.logger.warning(`🗑️  Ancien utilisateur supprimé`)
    }

    // 2. Créer le nouvel utilisateur
    const user = await UserModel.create({
      userUuid: randomUUID(),
      email: email,
      fullName: 'Eric Monnier',
      username: email.split('@')[0],
      password: await hash.make(password),
      isActive: true,
    })

    this.logger.success(`✅ Utilisateur recréé avec succès!`)
    this.logger.info(`   Email: ${email}`)
    this.logger.info(`   Password: ${password}`)
    this.logger.info(`   UUID: ${user.userUuid}`)
    this.logger.info(`   Hash: ${user.password.substring(0, 30)}...`)
  }
}
