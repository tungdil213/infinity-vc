import { inject } from '@adonisjs/core'
import { ClearSocialPresenceUseCase } from '#application/use_cases/clear_social_presence_use_case'
import { HeartbeatSocialPresenceUseCase } from '#application/use_cases/heartbeat_social_presence_use_case'
import { ListFriendPresenceUseCase } from '#application/use_cases/list_friend_presence_use_case'
import BusinessException from '#exceptions/business_exception'
import {
  ErrorClassification,
  ErrorSeverity,
  ToastType,
} from '#exceptions/types/error_classification'
import { socialPresenceHeartbeatValidator } from '#validators/social_presence_validator'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class FriendPresenceController {
  constructor(
    private readonly listFriendPresenceUseCase: ListFriendPresenceUseCase,
    private readonly heartbeatSocialPresenceUseCase: HeartbeatSocialPresenceUseCase,
    private readonly clearSocialPresenceUseCase: ClearSocialPresenceUseCase
  ) {}

  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    const result = await this.listFriendPresenceUseCase.execute(user.userUuid)

    if (result.isFailure) {
      throw this.userSafeError(result.error)
    }

    return response.json({
      friends: result.value.friends.map((friend) => ({
        ...friend,
        updatedAt: friend.updatedAt.toISOString(),
      })),
    })
  }

  async heartbeat({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { clientSessionId } = await request.validateUsing(socialPresenceHeartbeatValidator)
    const result = await this.heartbeatSocialPresenceUseCase.execute({
      userUuid: user.userUuid,
      displayName: this.resolveDisplayName(user),
      clientSessionId,
    })

    if (result.isFailure) {
      throw this.userSafeError(result.error)
    }

    return response.json({
      presence: {
        ...result.value,
        updatedAt: result.value.updatedAt.toISOString(),
      },
    })
  }

  async offline({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { clientSessionId } = await request.validateUsing(socialPresenceHeartbeatValidator)
    const result = await this.clearSocialPresenceUseCase.execute({
      userUuid: user.userUuid,
      displayName: this.resolveDisplayName(user),
      clientSessionId,
    })

    if (result.isFailure) {
      throw this.userSafeError(result.error)
    }

    return response.json({
      presence: {
        ...result.value,
        updatedAt: result.value.updatedAt.toISOString(),
      },
    })
  }

  private resolveDisplayName(user: { fullName?: string | null; email?: string | null }): string {
    if (typeof user.fullName === 'string' && user.fullName.trim().length > 0) {
      return user.fullName.trim()
    }

    return user.email?.trim() || 'Unknown User'
  }

  private userSafeError(message: string): BusinessException {
    return new BusinessException(message, {
      status: 400,
      code: 'E_SOCIAL_PRESENCE_FAILED',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.LOW,
      userMessage: message,
      toastType: ToastType.ERROR,
      reportToSentry: false,
    })
  }
}
