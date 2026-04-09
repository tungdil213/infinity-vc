import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Player from '#models/player'
import { USER_ROLES, normalizeUserRole } from '#domain/value_objects/user_role'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'

export default class BootstrapFirstUser extends BaseCommand {
  static commandName = 'bootstrap:first-user'
  static description = 'Create the first user for a private-network deployment'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.string({
    description: 'Email for the first user',
    required: true,
  })
  declare email: string

  @flags.string({
    description: 'Full name for the first user',
    required: true,
  })
  declare fullName: string

  @flags.string({
    description: 'Password for the first user',
    required: true,
  })
  declare password: string

  @flags.string({
    description: 'Nickname for the first player profile',
  })
  declare nickName?: string

  @flags.string({
    description: 'Role for the first user',
  })
  declare role?: string

  @flags.boolean({
    description: 'Generate an initial invitation code for onboarding the next user',
  })
  declare generateInvitation: boolean

  @flags.boolean({
    description: 'Allow running even when active users already exist',
  })
  declare force: boolean

  async run() {
    const existingUsers = await User.query().whereNull('deleted_at').count('* as total')
    const activeUserCount = Number((existingUsers[0] as any)?.$extras?.total ?? 0)

    if (activeUserCount > 0 && !this.force) {
      this.logger.error(
        `Refusing bootstrap: ${activeUserCount} active user(s) already exist. Re-run with --force if this is intentional.`
      )
      return
    }

    const normalizedEmail = this.email.trim().toLowerCase()
    const fullName = this.fullName.trim()
    const nickName = this.normalizeNickName(this.nickName ?? fullName)
    const role = normalizeUserRole(this.role ?? USER_ROLES.ADMIN)

    if (!normalizedEmail || !fullName || !this.password.trim()) {
      this.logger.error('Email, full name, and password are required.')
      return
    }

    const existingUser = await User.query().where('email', normalizedEmail).first()
    if (existingUser) {
      this.logger.error(`A user already exists with email ${normalizedEmail}.`)
      return
    }

    const existingPlayer = await Player.query()
      .whereRaw('LOWER(nick_name) = ?', [nickName.toLowerCase()])
      .whereNull('deleted_at')
      .first()
    if (existingPlayer) {
      this.logger.error(`A player already exists with nickname "${nickName}".`)
      return
    }

    const trx = await db.transaction()

    try {
      const user = new User()
      user.useTransaction(trx)
      user.fullName = fullName
      user.email = normalizedEmail
      user.password = this.password
      user.role = role
      user.invitedByUserUuid = null
      await user.save()

      const player = new Player()
      player.useTransaction(trx)
      player.userUuid = user.userUuid
      player.nickName = nickName
      player.avatarUrl = null
      await player.save()

      await trx.commit()

      this.logger.success('First user created successfully.')
      this.logger.info(`User UUID: ${user.userUuid}`)
      this.logger.info(`Email: ${user.email}`)
      this.logger.info(`Role: ${user.normalizedRole}`)
      this.logger.info(`Player UUID: ${player.playerUuid}`)
      this.logger.info(`Nickname: ${player.nickName}`)

      if (this.generateInvitation) {
        const invitationRepository = new DatabaseInvitationRepository()
        const generatedInvitation = await invitationRepository.generateCode({
          issuerUserUuid: user.userUuid,
          maxUses: 1,
          expiresAt: null,
        })

        if (generatedInvitation.isFailure) {
          this.logger.warning(
            `User created, but the initial invitation could not be generated: ${generatedInvitation.error}`
          )
          return
        }

        this.logger.success('Initial invitation code generated.')
        this.logger.info(`Invitation code: ${generatedInvitation.value.plainCode}`)
      } else {
        this.logger.info(
          'No invitation code generated. Use the Invitations page after login if needed.'
        )
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private normalizeNickName(source: string): string {
    const sanitized = source
      .replace(/[^a-zA-Z0-9\s_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30)
      .trim()

    return sanitized || 'admin'
  }
}
