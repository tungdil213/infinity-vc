import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import {
  getConfiguredAdminEmails,
  getConfiguredModeratorEmails,
} from '#infrastructure/security/admin_access'
import { USER_ROLES } from '#domain/value_objects/user_role'

export default class RbacSync extends BaseCommand {
  static commandName = 'rbac:sync'
  static description = 'Sync ADMIN and MODERATOR roles from ADMIN_EMAILS and MODERATOR_EMAILS'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const adminEmails = getConfiguredAdminEmails()
    const moderatorEmails = getConfiguredModeratorEmails()
    const moderatorOnlyEmails = [...moderatorEmails].filter((email) => !adminEmails.has(email))

    if (adminEmails.size === 0 && moderatorEmails.size === 0) {
      this.logger.warning(
        'No ADMIN_EMAILS or MODERATOR_EMAILS configured, nothing to sync.'
      )
      return
    }

    this.logger.info(
      `Syncing RBAC roles for ${adminEmails.size} admin email(s) and ${moderatorOnlyEmails.length} moderator email(s).`
    )

    let adminUpdated = 0
    let moderatorUpdated = 0

    if (adminEmails.size > 0) {
      const adminUpdateResult = await User.query()
        .whereIn('email', [...adminEmails])
        .update({ role: USER_ROLES.ADMIN })
      adminUpdated = this.toUpdateCount(adminUpdateResult)
    }

    if (moderatorOnlyEmails.length > 0) {
      const moderatorUpdateResult = await User.query()
        .whereIn('email', moderatorOnlyEmails)
        .whereNotIn('role', [USER_ROLES.ADMIN])
        .update({ role: USER_ROLES.MODERATOR })
      moderatorUpdated = this.toUpdateCount(moderatorUpdateResult)
    }

    const adminCountResult = await User.query().where('role', USER_ROLES.ADMIN).count('* as total')
    const moderatorCountResult = await User.query()
      .where('role', USER_ROLES.MODERATOR)
      .count('* as total')
    const playerCountResult = await User.query().where('role', USER_ROLES.PLAYER).count('* as total')

    const adminCount = Number((adminCountResult[0] as any)?.$extras?.total ?? 0)
    const moderatorCount = Number((moderatorCountResult[0] as any)?.$extras?.total ?? 0)
    const playerCount = Number((playerCountResult[0] as any)?.$extras?.total ?? 0)

    this.logger.success(
      `RBAC sync completed. Updated ${adminUpdated} admin(s) and ${moderatorUpdated} moderator(s).`
    )
    this.logger.info(
      `Current roles distribution: ADMIN=${adminCount}, MODERATOR=${moderatorCount}, PLAYER=${playerCount}.`
    )
  }

  private toUpdateCount(updateResult: unknown): number {
    if (typeof updateResult === 'number') {
      return updateResult
    }

    if (Array.isArray(updateResult) && typeof updateResult[0] === 'number') {
      return updateResult[0]
    }

    return 0
  }
}
