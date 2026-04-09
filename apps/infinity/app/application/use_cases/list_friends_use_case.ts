import {
  type FriendOverview,
  type FriendRepository,
} from '#application/repositories/friend_repository'

export class ListFriendsUseCase {
  constructor(private readonly friendRepository: FriendRepository) {}

  async execute(userUuid: string): Promise<FriendOverview> {
    return this.friendRepository.listOverview(userUuid)
  }
}
