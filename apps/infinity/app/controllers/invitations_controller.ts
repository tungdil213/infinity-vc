import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BusinessException from '#exceptions/business_exception'
import {
  ErrorClassification,
  ErrorSeverity,
  ToastType,
} from '#exceptions/types/error_classification'
import { GenerateInvitationCodeUseCase } from '#application/use_cases/generate_invitation_code_use_case'
import { ListMyInvitationsUseCase } from '#application/use_cases/list_my_invitations_use_case'
import { RevokeInvitationCodeUseCase } from '#application/use_cases/revoke_invitation_code_use_case'
import {
  invitationGenerateValidator,
  invitationUuidParamValidator,
} from '#validators/invitation_validators'
import { toUserSummary } from '#presenters/lobby_presenter'

@inject()
export default class InvitationsController {
  constructor(
    private readonly generateInvitationCodeUseCase: GenerateInvitationCodeUseCase,
    private readonly listMyInvitationsUseCase: ListMyInvitationsUseCase,
    private readonly revokeInvitationCodeUseCase: RevokeInvitationCodeUseCase
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const result = await this.listMyInvitationsUseCase.execute(user.userUuid)

    return inertia.render('invitations', {
      user: toUserSummary(user, { includeEmail: true }),
      invitations: result.invitations.map((invitation) => ({
        ...invitation,
        expiresAt: invitation.expiresAt?.toISOString() ?? null,
        usedAt: invitation.usedAt?.toISOString() ?? null,
        revokedAt: invitation.revokedAt?.toISOString() ?? null,
        createdAt: invitation.createdAt.toISOString(),
        updatedAt: invitation.updatedAt?.toISOString() ?? null,
      })),
      currentLobby: null,
    })
  }

  async generate({ auth, request, response, session, i18n }: HttpContext) {
    const user = auth.user!
    const { restrictedEmail } = await request.validateUsing(invitationGenerateValidator)

    const result = await this.generateInvitationCodeUseCase.execute({
      issuerUserUuid: user.userUuid,
      restrictedEmail,
    })

    if (result.isFailure) {
      throw this.userSafeError(
        this.translateError(i18n, result.error, 'invitations.generate.failure.generic')
      )
    }

    session.flash('success', i18n.t('invitations.generate.success'))
    session.flash('generatedInvitationCode', result.value.plainCode)

    return response.redirect().toRoute('invitations.index')
  }

  async revoke({ auth, params, response, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await invitationUuidParamValidator.validate(params)
    const result = await this.revokeInvitationCodeUseCase.execute(user.userUuid, uuid, user.isAdmin)

    if (result.isFailure) {
      throw this.userSafeError(
        this.translateError(i18n, result.error, 'invitations.revoke.failure.generic')
      )
    }

    return response.redirect().toRoute('invitations.index')
  }

  private translateError(i18n: HttpContext['i18n'], error: string, fallbackKey: string): string {
    const map: Record<string, string> = {
      'Invitation quota exceeded': 'invitations.generate.failure.quotaExceeded',
      'Invitation code was not found': 'invitations.revoke.failure.notFound',
      'Invitation code has expired': 'invitations.revoke.failure.expired',
      'Invitation code has already been used': 'invitations.revoke.failure.used',
      'Invitation code has already been revoked': 'invitations.revoke.failure.alreadyRevoked',
    }

    const key = map[error] ?? fallbackKey
    const translated = i18n.t(key)
    if (typeof translated === 'string' && !translated.startsWith('translation missing:')) {
      return translated
    }

    return error
  }

  private userSafeError(message: string): BusinessException {
    return new BusinessException(message, {
      status: 400,
      code: 'E_INVITATION_ACTION_FAILED',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      toastType: ToastType.ERROR,
      reportToSentry: false,
    })
  }
}
