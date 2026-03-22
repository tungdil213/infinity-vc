import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import type Game from '#domain/entities/game'
import { GameStatus } from '#domain/value_objects/game_status'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import UserModel from '#models/user'
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

    return inertia.render('profile', {
      user: this.toPageUser(user),
      stats: this.toStatsPayload(games, user.userUuid),
      recentGames: games.slice(0, 10).map((game) => this.toHistoryItem(game, user.userUuid)),
    })
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
          this.translate(i18n, 'auth.settings.failure.emailTaken', 'This email address is already in use')
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
        this.translate(i18n, 'auth.settings.failure.profileUpdate', 'Failed to update profile. Please try again.')
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
          this.translate(i18n, 'auth.settings.failure.invalidCurrentPassword', 'Current password is incorrect')
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
        this.translate(i18n, 'auth.settings.success.passwordUpdated', 'Password updated successfully')
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

  private toStatsPayload(games: Game[], userUuid: string) {
    const wins = games.filter(
      (game) =>
        game.status === GameStatus.FINISHED &&
        typeof game.gameData.winner === 'string' &&
        game.gameData.winner === userUuid
    ).length
    const losses = games.filter(
      (game) =>
        game.status === GameStatus.FINISHED &&
        typeof game.gameData.winner === 'string' &&
        game.gameData.winner !== userUuid
    ).length
    const draws = games.filter(
      (game) => game.status === GameStatus.FINISHED && typeof game.gameData.winner !== 'string'
    ).length
    const abandoned = games.filter((game) => game.status === GameStatus.ABANDONED).length
    const completed = games.filter((game) =>
      [GameStatus.FINISHED, GameStatus.ABANDONED, GameStatus.ARCHIVED].includes(game.status)
    ).length
    const active = games.filter((game) =>
      [GameStatus.IN_PROGRESS, GameStatus.PAUSED].includes(game.status)
    ).length
    const totalDurationMs = games.reduce((sum, game) => sum + game.duration, 0)
    const averageDurationMs = games.length > 0 ? Math.round(totalDurationMs / games.length) : 0
    const winRate = completed > 0 ? Number((wins / completed).toFixed(3)) : 0

    return {
      totalGames: games.length,
      activeGames: active,
      completedGames: completed,
      wins,
      losses,
      draws,
      abandoned,
      winRate,
      averageDurationMs,
    }
  }

  private toHistoryItem(game: Game, currentUserUuid: string) {
    const winnerUuid = typeof game.gameData.winner === 'string' ? game.gameData.winner : null
    const result =
      game.status === GameStatus.ABANDONED
        ? 'abandoned'
        : winnerUuid === currentUserUuid
          ? 'win'
          : winnerUuid
            ? 'loss'
            : 'draw'

    return {
      gameUuid: game.uuid,
      status: game.status,
      result,
      gameType: this.getGameType(game),
      playerCount: game.players.length,
      winnerUuid,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt ?? null,
      durationMs: game.duration,
    }
  }

  private getGameType(game: Game): string {
    const gameData = this.asRecord(game.gameData)
    const runtime = gameData ? this.asRecord(gameData.runtime) : null
    return typeof runtime?.gameType === 'string' ? runtime.gameType : 'unknown'
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }

    return null
  }
}
