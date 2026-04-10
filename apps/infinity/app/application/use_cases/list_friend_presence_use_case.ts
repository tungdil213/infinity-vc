import { toFriendPresenceDto } from '#application/dtos/friend_presence_dto'
import { Result } from '#shared/result'
import type { FriendPresenceSnapshotDTO } from '#application/dtos/friend_presence_dto'
import type { FriendRepository } from '#application/repositories/friend_repository'
import type { SocialPresenceRepository } from '#application/repositories/social_presence_repository'

const STATUS_PRIORITY = {
  in_game: 0,
  in_lobby: 1,
  online: 2,
  offline: 3,
} as const

export class ListFriendPresenceUseCase {
  constructor(
    private readonly friendRepository: FriendRepository,
    private readonly socialPresenceRepository: SocialPresenceRepository
  ) {}

  async execute(userUuid: string): Promise<Result<FriendPresenceSnapshotDTO>> {
    if (!userUuid.trim()) {
      return Result.fail('User UUID is required')
    }

    const friends = await this.friendRepository.listFriends(userUuid)
    const presenceByUserUuid = await this.socialPresenceRepository.getPresenceForUsers(
      friends.map((friend) => friend.friendUserUuid)
    )

    const snapshot = friends
      .map((friend) => {
        const currentPresence = presenceByUserUuid.get(friend.friendUserUuid)
        if (!currentPresence) {
          return {
            friendUserUuid: friend.friendUserUuid,
            displayName: friend.friendDisplayName,
            status: 'offline',
            lobbyId: null,
            lobbyName: null,
            gameId: null,
            updatedAt: friend.createdAt,
          } as const
        }

        return {
          ...toFriendPresenceDto(currentPresence),
          displayName: friend.friendDisplayName,
        }
      })
      .sort((left, right) => {
        const statusDelta = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status]
        if (statusDelta !== 0) {
          return statusDelta
        }

        return left.displayName.localeCompare(right.displayName, undefined, {
          sensitivity: 'base',
        })
      })

    return Result.ok({ friends: snapshot })
  }
}
