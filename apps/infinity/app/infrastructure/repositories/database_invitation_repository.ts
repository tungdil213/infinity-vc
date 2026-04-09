import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import UserModel from '#models/user'
import InvitationCodeModel from '#models/invitation_code'
import { Result } from '#shared/result'
import { safeSystemError } from '#shared/error_sanitizer'
import {
  type GenerateInvitationCodeRequest,
  type GenerateInvitationCodeResponse,
  type InvitationCodeRecord,
  type InvitationCodeStatus,
  type InvitationRepository,
  type RegisterWithInvitationRequest,
  type RegisterWithInvitationResponse,
  type ValidatedInvitationCode,
} from '#application/repositories/invitation_repository'
import {
  computeInvitationCodeDigest,
  formatInvitationCode,
  generateInvitationCode,
  normalizeInvitationCode,
} from '#infrastructure/security/invitation_code_security'

type PersistedInvitationRow = {
  uuid: string
  issuer_user_uuid: string
  status: InvitationCodeStatus
  expires_at: Date | string | null
  max_uses: number | string
  used_count: number | string
  restricted_email: string | null
  used_by_user_uuid: string | null
  used_at: Date | string | null
  revoked_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string | null
}

type UserRow = {
  user_uuid: string
  full_name: string | null
  email: string
}

export class DatabaseInvitationRepository implements InvitationRepository {
  async validateCode(
    invitationCode: string,
    email?: string
  ): Promise<Result<ValidatedInvitationCode>> {
    try {
      const normalizedCode = normalizeInvitationCode(invitationCode)
      if (!normalizedCode) {
        return Result.fail('Invitation code is required')
      }

      const invitationModel = await InvitationCodeModel.query()
        .where('code_digest', computeInvitationCodeDigest(normalizedCode))
        .first()

      if (!invitationModel) {
        return Result.fail('Invitation code is invalid')
      }

      const validationResult = await this.ensureInvitationIsUsable(invitationModel, email)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.error)
      }

      const issuer = await UserModel.query()
        .where('user_uuid', invitationModel.issuerUserUuid)
        .whereNull('deleted_at')
        .first()

      return Result.ok({
        normalizedCode: formatInvitationCode(normalizedCode),
        invitation: this.toInvitationRecord(invitationModel),
        issuerDisplayName: issuer?.fullName ?? null,
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'validate_invitation_code'))
    }
  }

  async registerUserWithInvitation(
    request: RegisterWithInvitationRequest
  ): Promise<Result<RegisterWithInvitationResponse>> {
    const normalizedEmail = request.email.trim().toLowerCase()
    const normalizedCode = normalizeInvitationCode(request.invitationCode)
    const fullName = request.fullName.trim()
    const nickName = this.generateDefaultNickName(fullName)

    if (!normalizedCode) {
      return Result.fail('Invitation code is required')
    }

    const trx = await db.transaction()

    try {
      const invitationRow = (await trx
        .from('invitation_codes')
        .where('code_digest', computeInvitationCodeDigest(normalizedCode))
        .first()) as PersistedInvitationRow | null

      if (!invitationRow) {
        await trx.rollback()
        return Result.fail('Invitation code is invalid')
      }

      const invitationValidation = await this.ensureInvitationRowIsUsable(
        invitationRow,
        normalizedEmail,
        trx
      )
      if (invitationValidation.isFailure) {
        await trx.rollback()
        return Result.fail(invitationValidation.error)
      }

      const existingUser = await trx
        .from('users')
        .where('email', normalizedEmail)
        .whereNull('deleted_at')
        .first()

      if (existingUser) {
        await trx.rollback()
        return Result.fail('An account with this information already exists')
      }

      const existingNickname = await trx
        .from('players')
        .whereRaw('LOWER(nick_name) = ?', [nickName.toLowerCase()])
        .whereNull('deleted_at')
        .first()

      if (existingNickname) {
        await trx.rollback()
        return Result.fail('This name combination is already taken as a nickname')
      }

      const inviter = (await trx
        .from('users')
        .where('user_uuid', invitationRow.issuer_user_uuid)
        .whereNull('deleted_at')
        .first()) as UserRow | null

      if (!inviter) {
        await trx.rollback()
        return Result.fail('Invitation code is invalid')
      }

      const userUuid = randomUUID()
      const playerUuid = randomUUID()
      const now = DateTime.now()
      const nowSql = this.toDatabaseDateTime(now)
      const hashedPassword = await hash.make(request.password)

      await trx.table('users').insert({
        user_uuid: userUuid,
        full_name: fullName,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'PLAYER',
        invited_by_user_uuid: invitationRow.issuer_user_uuid,
        created_at: nowSql,
        updated_at: nowSql,
      })

      await trx.table('players').insert({
        player_uuid: playerUuid,
        user_uuid: userUuid,
        nick_name: nickName,
        avatar_url: null,
        deleted_at: null,
        created_at: nowSql,
        updated_at: nowSql,
      })

      const nextUsedCount = Number(invitationRow.used_count) + 1
      const nextStatus: InvitationCodeStatus =
        nextUsedCount >= Number(invitationRow.max_uses) ? 'used' : 'active'

      const updatedRows = await trx
        .from('invitation_codes')
        .where('uuid', invitationRow.uuid)
        .where('status', 'active')
        .where('used_count', Number(invitationRow.used_count))
        .update({
          used_count: nextUsedCount,
          used_by_user_uuid: userUuid,
          used_at: nowSql,
          status: nextStatus,
          updated_at: nowSql,
        })

      if (!updatedRows) {
        await trx.rollback()
        return Result.fail('Invitation code is no longer available')
      }

      await trx.commit()

      logger.info(
        {
          invitationUuid: invitationRow.uuid,
          issuerUserUuid: invitationRow.issuer_user_uuid,
          usedByUserUuid: userUuid,
        },
        'Invitation code used for registration'
      )

      return Result.ok({
        user: {
          uuid: userUuid,
          fullName,
          email: normalizedEmail,
          invitedByUserUuid: invitationRow.issuer_user_uuid,
          createdAt: now.toJSDate(),
        },
        player: {
          uuid: playerUuid,
          nickName,
        },
        inviter: {
          uuid: inviter.user_uuid,
          fullName: inviter.full_name,
        },
        invitation: {
          uuid: invitationRow.uuid,
          status: nextStatus,
          usedCount: nextUsedCount,
        },
      })
    } catch (error) {
      await trx.rollback()
      return Result.fail(safeSystemError(error, 'register_user_with_invitation'))
    }
  }

  async generateCode(
    request: GenerateInvitationCodeRequest
  ): Promise<Result<GenerateInvitationCodeResponse>> {
    try {
      const issuer = await UserModel.query()
        .where('user_uuid', request.issuerUserUuid)
        .whereNull('deleted_at')
        .first()

      if (!issuer) {
        return Result.fail('Issuer user was not found')
      }

      for (let attempt = 0; attempt < 5; attempt++) {
        const plainCode = generateInvitationCode()
        const codeDigest = computeInvitationCodeDigest(plainCode)

        try {
          const invitation = await InvitationCodeModel.create({
            uuid: randomUUID(),
            codeDigest,
            issuerUserUuid: request.issuerUserUuid,
            status: 'active',
            expiresAt: request.expiresAt ? DateTime.fromJSDate(request.expiresAt) : null,
            maxUses: request.maxUses ?? 1,
            usedCount: 0,
            restrictedEmail: request.restrictedEmail ?? null,
            usedByUserUuid: null,
            usedAt: null,
            revokedAt: null,
          })

          logger.info(
            {
              invitationUuid: invitation.uuid,
              issuerUserUuid: request.issuerUserUuid,
              restrictedEmail: request.restrictedEmail ?? null,
            },
            'Invitation code generated'
          )

          return Result.ok({
            invitation: this.toInvitationRecord(invitation),
            plainCode,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (!message.toLowerCase().includes('unique')) {
            return Result.fail(safeSystemError(error, 'generate_invitation_code'))
          }
        }
      }

      return Result.fail('Failed to generate invitation code')
    } catch (error) {
      return Result.fail(safeSystemError(error, 'generate_invitation_code'))
    }
  }

  async listByIssuerUserUuid(userUuid: string): Promise<InvitationCodeRecord[]> {
    const invitationModels = await InvitationCodeModel.query()
      .where('issuer_user_uuid', userUuid)
      .orderBy('created_at', 'desc')

    return invitationModels.map((model) => this.toInvitationRecord(model))
  }

  async countActiveByIssuerUserUuid(userUuid: string, now = new Date()): Promise<number> {
    const normalizedNow = this.toDatabaseDateTime(DateTime.fromJSDate(now))
    const result = await db
      .from('invitation_codes')
      .where('issuer_user_uuid', userUuid)
      .where('status', 'active')
      .where((query) => {
        query.whereNull('expires_at').orWhere('expires_at', '>', normalizedNow)
      })
      .count('* as total')
      .first()

    return Number((result as { total?: number | string } | null)?.total ?? 0)
  }

  async revokeByUuid(
    uuid: string,
    actorUserUuid: string,
    allowAdminOverride = false
  ): Promise<Result<InvitationCodeRecord>> {
    try {
      const query = InvitationCodeModel.query().where('uuid', uuid)
      if (!allowAdminOverride) {
        query.where('issuer_user_uuid', actorUserUuid)
      }

      const invitationModel = await query.first()

      if (!invitationModel) {
        return Result.fail('Invitation code was not found')
      }

      const validationResult = await this.ensureInvitationIsRevocable(invitationModel)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.error)
      }

      invitationModel.status = 'revoked'
      invitationModel.revokedAt = DateTime.now()
      await invitationModel.save()

      logger.info(
        {
          invitationUuid: invitationModel.uuid,
          issuerUserUuid: invitationModel.issuerUserUuid,
          revokedByUserUuid: actorUserUuid,
          usedAdminOverride: allowAdminOverride,
        },
        'Invitation code revoked'
      )

      return Result.ok(this.toInvitationRecord(invitationModel))
    } catch (error) {
      return Result.fail(safeSystemError(error, 'revoke_invitation_code'))
    }
  }

  private async ensureInvitationIsUsable(
    invitationModel: InvitationCodeModel,
    email?: string
  ): Promise<Result<void>> {
    if (this.isExpired(invitationModel.status, invitationModel.expiresAt?.toJSDate() ?? null)) {
      if (invitationModel.status === 'active') {
        invitationModel.status = 'expired'
        await invitationModel.save()
      }
      return Result.fail('Invitation code has expired')
    }

    if (invitationModel.status === 'revoked') {
      return Result.fail('Invitation code has been revoked')
    }

    if (invitationModel.status === 'used' || invitationModel.usedCount >= invitationModel.maxUses) {
      return Result.fail('Invitation code has already been used')
    }

    if (
      email &&
      invitationModel.restrictedEmail &&
      invitationModel.restrictedEmail.toLowerCase() !== email.trim().toLowerCase()
    ) {
      return Result.fail('Invitation code is not valid for this email address')
    }

    return Result.ok(undefined)
  }

  private async ensureInvitationRowIsUsable(
    invitationRow: PersistedInvitationRow,
    email: string,
    trx: ReturnType<typeof db.transaction> extends Promise<infer T> ? T : never
  ): Promise<Result<void>> {
    const expiresAt = this.asDate(invitationRow.expires_at)
    if (this.isExpired(invitationRow.status, expiresAt)) {
      if (invitationRow.status === 'active') {
        const nowSql = this.toDatabaseDateTime(DateTime.now())
        await trx.from('invitation_codes').where('uuid', invitationRow.uuid).update({
          status: 'expired',
          updated_at: nowSql,
        })
      }
      return Result.fail('Invitation code has expired')
    }

    if (invitationRow.status === 'revoked') {
      return Result.fail('Invitation code has been revoked')
    }

    if (
      invitationRow.status === 'used' ||
      Number(invitationRow.used_count) >= Number(invitationRow.max_uses)
    ) {
      return Result.fail('Invitation code has already been used')
    }

    if (
      invitationRow.restricted_email &&
      invitationRow.restricted_email.toLowerCase() !== email.toLowerCase()
    ) {
      return Result.fail('Invitation code is not valid for this email address')
    }

    return Result.ok(undefined)
  }

  private async ensureInvitationIsRevocable(
    invitationModel: InvitationCodeModel
  ): Promise<Result<void>> {
    if (this.isExpired(invitationModel.status, invitationModel.expiresAt?.toJSDate() ?? null)) {
      invitationModel.status = 'expired'
      await invitationModel.save()
      return Result.fail('Invitation code has expired')
    }

    if (invitationModel.status === 'used') {
      return Result.fail('Invitation code has already been used')
    }

    if (invitationModel.status === 'revoked') {
      return Result.fail('Invitation code has already been revoked')
    }

    return Result.ok(undefined)
  }

  private toInvitationRecord(model: InvitationCodeModel): InvitationCodeRecord {
    const effectiveStatus = this.isExpired(model.status, model.expiresAt?.toJSDate() ?? null)
      ? 'expired'
      : model.status

    return {
      uuid: model.uuid,
      issuerUserUuid: model.issuerUserUuid,
      status: effectiveStatus,
      expiresAt: model.expiresAt?.toJSDate() ?? null,
      maxUses: model.maxUses,
      usedCount: model.usedCount,
      restrictedEmail: model.restrictedEmail,
      usedByUserUuid: model.usedByUserUuid,
      usedAt: model.usedAt?.toJSDate() ?? null,
      revokedAt: model.revokedAt?.toJSDate() ?? null,
      createdAt: model.createdAt.toJSDate(),
      updatedAt: model.updatedAt?.toJSDate() ?? null,
    }
  }

  private isExpired(status: InvitationCodeStatus, expiresAt: Date | null): boolean {
    return status === 'active' && !!expiresAt && expiresAt.getTime() <= Date.now()
  }

  private asDate(value: Date | string | null): Date | null {
    if (!value) {
      return null
    }

    if (value instanceof Date) {
      return value
    }

    const sqlDate = DateTime.fromSQL(value)
    if (sqlDate.isValid) {
      return sqlDate.toJSDate()
    }

    const isoDate = DateTime.fromISO(value)
    if (isoDate.isValid) {
      return isoDate.toJSDate()
    }

    return new Date(value)
  }

  private generateDefaultNickName(fullName: string): string {
    const sanitized = fullName
      .replace(/[^a-zA-Z0-9\s_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30)
      .trim()

    if (sanitized.length >= 3) {
      return sanitized
    }

    return `player_${randomUUID().slice(0, 8)}`
  }

  private toDatabaseDateTime(value: DateTime): string {
    return value.toSQL({ includeOffset: false }) ?? value.toISO() ?? value.toJSDate().toISOString()
  }
}
