import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import type Game from '#domain/entities/game'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import UserModel from '#models/user'
import {
  projectActiveGames,
  projectGameHistoryItem,
  projectGameStats,
  type GameProjectionInput,
} from '@infinity.dev/game-runtime-session'
import {
  settingsPasswordValidator,
  settingsProfileValidator,
} from '#validators/account_settings_validator'

@inject()
export default class ProfileSettingsController {
  constructor(private readonly gameRepository: DatabaseGameRepository) {}

  async showProfile({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const games = await this.gameRepository.findByPlayer(user.userUuid)
    const projectedGames = games.map((game) => this.toGameProjectionInput(game))

    return inertia.render('profile', {
      user: this.toPageUser(user),
      stats: projectGameStats(projectedGames, user.userUuid),
      recentGames: projectedGames
        .slice(0, 10)
        .map((game) => projectGameHistoryItem(game, user.userUuid)),
      activeGames: projectActiveGames(projectedGames),
    } as any)
  }

  async showSettings({ inertia, auth }: HttpContext) {
    const user = auth.user!

    return inertia.render('settings', {
      user: this.toPageUser(user),
    })
  }

  async updateProfile({ request, response, auth, session, i18n }: HttpContext) {
    const user = auth.user!
    const { fullName, email } = await request.validateUsing(settingsProfileValidator)
    const normalizedEmail = email.trim().toLowerCase()

    try {
      const conflictingUser = await UserModel.query()
        .where('email', normalizedEmail)
        .where('user_uuid', '!=', user.userUuid)
        .whereNull('deleted_at')
        .first()

      if (conflictingUser) {
        session.flash(
          'error',
          this.translate(
            i18n,
            'auth.settings.failure.emailTaken',
            'This email address is already in use'
          )
        )
        return response.redirect().back()
      }

      user.fullName = fullName.trim()
      user.email = normalizedEmail
      await user.save()

      session.flash(
        'success',
        this.translate(i18n, 'auth.settings.success.profileUpdated', 'Profile updated successfully')
      )
      return response.redirect().back()
    } catch (error) {
      logger.error({ error, userUuid: user.userUuid }, 'Profile update failed')
      session.flash(
        'error',
        this.translate(
          i18n,
          'auth.settings.failure.profileUpdate',
          'Failed to update profile. Please try again.'
        )
      )
      return response.redirect().back()
    }
  }

  async updatePassword({ request, response, auth, session, i18n }: HttpContext) {
    const user = auth.user!
    const { currentPassword, password } = await request.validateUsing(settingsPasswordValidator)

    try {
      const hasValidCurrentPassword = await hash.verify(user.password, currentPassword)
      if (!hasValidCurrentPassword) {
        session.flash(
          'error',
          this.translate(
            i18n,
            'auth.settings.failure.invalidCurrentPassword',
            'Current password is incorrect'
          )
        )
        return response.redirect().back()
      }

      const isSamePassword = await hash.verify(user.password, password)
      if (isSamePassword) {
        session.flash(
          'error',
          this.translate(
            i18n,
            'auth.settings.failure.samePassword',
            'New password must be different from current password'
          )
        )
        return response.redirect().back()
      }

      user.password = password
      await user.save()

      session.flash(
        'success',
        this.translate(
          i18n,
          'auth.settings.success.passwordUpdated',
          'Password updated successfully'
        )
      )
      return response.redirect().back()
    } catch (error) {
      logger.error({ error, userUuid: user.userUuid }, 'Password update failed')
      session.flash(
        'error',
        this.translate(
          i18n,
          'auth.settings.failure.passwordUpdate',
          'Failed to update password. Please try again.'
        )
      )
      return response.redirect().back()
    }
  }

  private translate(i18n: HttpContext['i18n'], key: string, fallback: string): string {
    const translated = i18n.t(key)
    if (typeof translated !== 'string') {
      return fallback
    }

    return translated.startsWith('translation missing:') ? fallback : translated
  }

  private toPageUser(user: UserModel) {
    return {
      uuid: user.userUuid,
      fullName: user.fullName ?? 'Unknown User',
      email: user.email,
      role: user.normalizedRole,
      createdAt: user.createdAt.toISO(),
    }
  }

  private toGameProjectionInput(game: Game): GameProjectionInput {
    return {
      uuid: game.uuid,
      status: game.status,
      players: game.players,
      gameData: game.gameData,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt ?? null,
      durationMs: game.duration,
    }
  }
}
