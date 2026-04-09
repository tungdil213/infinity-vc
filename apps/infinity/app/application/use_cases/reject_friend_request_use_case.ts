import type { Result } from '#shared/result'
import {
  type FriendRepository,
  type FriendRequestRecord,
} from '#application/repositories/friend_repository'

export class RejectFriendRequestUseCase {
  constructor(private readonly friendRepository: FriendRepository) {}

  async execute(
    requestUuid: string,
    recipientUserUuid: string
  ): Promise<Result<FriendRequestRecord>> {
    return this.friendRepository.rejectRequest(requestUuid, recipientUserUuid)
  }
}
