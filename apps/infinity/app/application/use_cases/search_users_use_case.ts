import {
  type FriendRepository,
  type FriendUserRecord,
} from '#application/repositories/friend_repository'

export interface SearchUsersRequest {
  userUuid: string
  query: string
}

export interface SearchUsersResponse {
  users: FriendUserRecord[]
}

export class SearchUsersUseCase {
  constructor(private readonly friendRepository: FriendRepository) {}

  async execute(request: SearchUsersRequest): Promise<SearchUsersResponse> {
    const normalizedQuery = request.query.trim()
    if (normalizedQuery.length < 2) {
      return { users: [] }
    }

    const users = await this.friendRepository.searchUsers(normalizedQuery, request.userUuid)

    return { users }
  }
}
