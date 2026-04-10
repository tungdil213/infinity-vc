import { toFriendPresenceDto } from '#application/dtos/friend_presence_dto'
import { Result } from '#shared/result'
import { buildUserPresenceRecord, hasPresenceChanged } from './support/social_presence.js'
import type { FriendPresenceDTO } from '#application/dtos/friend_presence_dto'
import type { FriendRepository } from '#application/repositories/friend_repository'
import type { SocialPresenceRepository } from '#application/repositories/social_presence_repository'
import type { SocialPresenceContextResolver } from '#application/services/social_presence_context_resolver'
import type { SocialPresenceNotifier } from '#application/services/social_presence_notifier'

export class ClearSocialPresenceUseCase {
  constructor(
    private readonly friendRepository: FriendRepository,
    private readonly socialPresenceRepository: SocialPresenceRepository,
    private readonly socialPresenceContextResolver: SocialPresenceContextResolver,
    private readonly socialPresenceNotifier: SocialPresenceNotifier
  ) {}

  async execute(args: {
    userUuid: string
    displayName: string
    clientSessionId?: string
  }): Promise<Result<FriendPresenceDTO>> {
    const userUuid = args.userUuid.trim()
    const displayName = args.displayName.trim()
    const clientSessionId = args.clientSessionId?.trim()

    if (!userUuid || !displayName) {
      return Result.fail('User UUID and display name are required')
    }

    const previousPresence = await this.socialPresenceRepository.getPresence(userUuid)
    const sessionState = clientSessionId
      ? await this.socialPresenceRepository.removeSession(userUuid, clientSessionId)
      : await this.socialPresenceRepository.clearSessions(userUuid)
    if (sessionState.isFailure) {
      return Result.fail(sessionState.error)
    }

    const resolvedContext = sessionState.value.hasActiveSessions
      ? await this.socialPresenceContextResolver.resolve(userUuid)
      : null

    const nextPresence = buildUserPresenceRecord({
      userUuid,
      displayName,
      context:
        resolvedContext && resolvedContext.isSuccess
          ? resolvedContext.value
          : sessionState.value.hasActiveSessions
            ? {
                status: 'online',
                lobbyId: null,
                lobbyName: null,
                gameId: null,
              }
            : null,
      updatedAt: sessionState.value.updatedAt,
    })

    const savedPresence = await this.socialPresenceRepository.savePresence(nextPresence)
    if (savedPresence.isFailure) {
      return Result.fail(savedPresence.error)
    }

    if (hasPresenceChanged(previousPresence, savedPresence.value)) {
      const friends = await this.friendRepository.listFriends(userUuid)
      await this.socialPresenceNotifier.notifyFriends(
        friends.map((friend) => friend.friendUserUuid),
        toFriendPresenceDto(savedPresence.value)
      )
    }

    return Result.ok(toFriendPresenceDto(savedPresence.value))
  }
}
