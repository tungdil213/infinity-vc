import type { Result } from '#shared/result'
import {
  type FriendRepository,
  type FriendRequestRecord,
} from '#application/repositories/friend_repository'

export class CancelSentFriendRequestUseCase {
  constructor(private readonly friendRepository: FriendRepository) {}

  async execute(
    requestUuid: string,
    requesterUserUuid: string
  ): Promise<Result<FriendRequestRecord>> {
    return this.friendRepository.cancelRequest(requestUuid, requesterUserUuid)
  }
}
