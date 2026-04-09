import { Result } from '#shared/result'
import { type FriendRepository } from '#application/repositories/friend_repository'

export class RemoveFriendUseCase {
  constructor(private readonly friendRepository: FriendRepository) {}

  async execute(userUuid: string, friendUserUuid: string): Promise<Result<void>> {
    if (userUuid === friendUserUuid) {
      return Result.fail('You cannot remove yourself from your friends')
    }

    return this.friendRepository.removeFriend(userUuid, friendUserUuid)
  }
}
