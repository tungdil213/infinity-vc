import type { Result } from '#shared/result'
import {
  type FriendRepository,
  type FriendshipRecord,
} from '#application/repositories/friend_repository'

export class AcceptFriendRequestUseCase {
  constructor(private readonly friendRepository: FriendRepository) {}

  async execute(requestUuid: string, recipientUserUuid: string): Promise<Result<FriendshipRecord>> {
    return this.friendRepository.acceptRequest(requestUuid, recipientUserUuid)
  }
}
