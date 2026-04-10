import {
  type FriendRepository,
  type FriendRequestRecord,
} from '#application/repositories/friend_repository'
import { USER_ROLES } from '#domain/value_objects/user_role'
import { Result } from '#shared/result'
import type { UserRepository } from '#application/repositories/user_repository'

export class SendFriendRequestUseCase {
  constructor(
    private readonly friendRepository: FriendRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(
    requesterUserUuid: string,
    recipientUserUuid: string
  ): Promise<Result<FriendRequestRecord>> {
    if (requesterUserUuid === recipientUserUuid) {
      return Result.fail('You cannot send a friend request to yourself')
    }

    const requester = await this.userRepository.findByUuid(requesterUserUuid)
    const recipient = await this.userRepository.findByUuid(recipientUserUuid)

    if (!requester || !recipient) {
      return Result.fail('User was not found')
    }

    if (requester.role !== USER_ROLES.ADMIN) {
      return Result.fail('Only admins can send friend requests')
    }

    if (recipient.role === USER_ROLES.ADMIN) {
      return Result.fail('You cannot send a friend request to an admin')
    }

    return this.friendRepository.sendRequest(requesterUserUuid, recipientUserUuid)
  }
}
