import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BusinessException from '#exceptions/business_exception'
import {
  ErrorClassification,
  ErrorSeverity,
  ToastType,
} from '#exceptions/types/error_classification'
import { ListFriendsUseCase } from '#application/use_cases/list_friends_use_case'
import { SearchUsersUseCase } from '#application/use_cases/search_users_use_case'
import { SendFriendRequestUseCase } from '#application/use_cases/send_friend_request_use_case'
import { AcceptFriendRequestUseCase } from '#application/use_cases/accept_friend_request_use_case'
import { RejectFriendRequestUseCase } from '#application/use_cases/reject_friend_request_use_case'
import { CancelSentFriendRequestUseCase } from '#application/use_cases/cancel_sent_friend_request_use_case'
import { RemoveFriendUseCase } from '#application/use_cases/remove_friend_use_case'
import {
  friendRequestUuidParamValidator,
  friendSearchValidator,
  removeFriendParamValidator,
  sendFriendRequestValidator,
} from '#validators/friend_validators'
import { toUserSummary } from '#presenters/lobby_presenter'

@inject()
export default class FriendsController {
  constructor(
    private readonly listFriendsUseCase: ListFriendsUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly sendFriendRequestUseCase: SendFriendRequestUseCase,
    private readonly acceptFriendRequestUseCase: AcceptFriendRequestUseCase,
    private readonly rejectFriendRequestUseCase: RejectFriendRequestUseCase,
    private readonly cancelSentFriendRequestUseCase: CancelSentFriendRequestUseCase,
    private readonly removeFriendUseCase: RemoveFriendUseCase
  ) {}

  async index({ inertia, auth, request }: HttpContext) {
    const user = auth.user!
    const { q } = await friendSearchValidator.validate({ q: request.input('q') })
    const overview = await this.listFriendsUseCase.execute(user.userUuid)
    const search = q
      ? await this.searchUsersUseCase.execute({
          userUuid: user.userUuid,
          query: q,
        })
      : { users: [] }

    return inertia.render('friends', {
      user: toUserSummary(user, { includeEmail: true }),
      currentLobby: null,
      friends: overview.friends.map((friend) => ({
        ...friend,
        createdAt: friend.createdAt.toISOString(),
      })),
      incomingRequests: overview.incomingRequests.map((requestRow) => ({
        ...requestRow,
        createdAt: requestRow.createdAt.toISOString(),
        respondedAt: requestRow.respondedAt?.toISOString() ?? null,
      })),
      outgoingRequests: overview.outgoingRequests.map((requestRow) => ({
        ...requestRow,
        createdAt: requestRow.createdAt.toISOString(),
        respondedAt: requestRow.respondedAt?.toISOString() ?? null,
      })),
      searchResults: search.users.map((entry) => ({
        ...entry,
      })) as any,
      searchQuery: q ?? '',
    })
  }

  async sendRequest({ auth, request, response, i18n }: HttpContext) {
    const user = auth.user!
    const { recipientUserUuid } = await request.validateUsing(sendFriendRequestValidator)
    const result = await this.sendFriendRequestUseCase.execute(user.userUuid, recipientUserUuid)

    if (result.isFailure) {
      throw this.userSafeError(this.translateError(i18n, result.error))
    }

    return response.redirect().toRoute('friends.index')
  }

  async accept({ auth, params, response, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await friendRequestUuidParamValidator.validate(params)
    const result = await this.acceptFriendRequestUseCase.execute(uuid, user.userUuid)

    if (result.isFailure) {
      throw this.userSafeError(this.translateError(i18n, result.error))
    }

    return response.redirect().toRoute('friends.index')
  }

  async reject({ auth, params, response, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await friendRequestUuidParamValidator.validate(params)
    const result = await this.rejectFriendRequestUseCase.execute(uuid, user.userUuid)

    if (result.isFailure) {
      throw this.userSafeError(this.translateError(i18n, result.error))
    }

    return response.redirect().toRoute('friends.index')
  }

  async cancel({ auth, params, response, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await friendRequestUuidParamValidator.validate(params)
    const result = await this.cancelSentFriendRequestUseCase.execute(uuid, user.userUuid)

    if (result.isFailure) {
      throw this.userSafeError(this.translateError(i18n, result.error))
    }

    return response.redirect().toRoute('friends.index')
  }

  async remove({ auth, params, response, i18n }: HttpContext) {
    const user = auth.user!
    const { friendUserUuid } = await removeFriendParamValidator.validate(params)
    const result = await this.removeFriendUseCase.execute(user.userUuid, friendUserUuid)

    if (result.isFailure) {
      throw this.userSafeError(this.translateError(i18n, result.error))
    }

    return response.redirect().toRoute('friends.index')
  }

  private translateError(i18n: HttpContext['i18n'], error: string): string {
    const map: Record<string, string> = {
      'You cannot send a friend request to yourself': 'friends.errors.selfRequest',
      'A friend request is already pending for this user': 'friends.errors.duplicateRequest',
      'You are already friends with this user': 'friends.errors.alreadyFriends',
      'Friend request was not found': 'friends.errors.requestNotFound',
      'Friend request is no longer pending': 'friends.errors.requestNotPending',
      'Friendship was not found': 'friends.errors.friendshipNotFound',
      'User was not found': 'friends.errors.userNotFound',
    }

    const key = map[error]
    if (!key) {
      return this.translateFallback(
        i18n,
        'friends.errors.actionFailed',
        'Unable to complete the friend action.'
      )
    }

    return this.translateFallback(i18n, key, error)
  }

  private translateFallback(i18n: HttpContext['i18n'], key: string, fallback: string): string {
    const translated = i18n.t(key)
    if (typeof translated === 'string' && !translated.startsWith('translation missing:')) {
      return translated
    }

    return fallback
  }

  private userSafeError(message: string): BusinessException {
    return new BusinessException(message, {
      status: 400,
      code: 'E_FRIEND_ACTION_FAILED',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      toastType: ToastType.ERROR,
      reportToSentry: false,
    })
  }
}
