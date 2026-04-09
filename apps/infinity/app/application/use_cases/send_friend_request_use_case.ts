import { Result } from '#shared/result'
import {
  type FriendRepository,
  type FriendRequestRecord,
} from '#application/repositories/friend_repository'

export class SendFriendRequestUseCase {
  constructor(private readonly friendRepository: FriendRepository) {}

  async execute(
    requesterUserUuid: string,
    recipientUserUuid: string
  ): Promise<Result<FriendRequestRecord>> {
    if (requesterUserUuid === recipientUserUuid) {
      return Result.fail('You cannot send a friend request to yourself')
    }

    return this.friendRepository.sendRequest(requesterUserUuid, recipientUserUuid)
  }
}
