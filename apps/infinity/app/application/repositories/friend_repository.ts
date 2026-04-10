import type { Result } from '#shared/result'

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface PublicSocialUserView {
  userUuid: string
  displayName: string
}

export interface FriendUserRecord extends PublicSocialUserView {
  isFriend: boolean
  hasIncomingRequest: boolean
  hasOutgoingRequest: boolean
}

export interface FriendRequestRecord {
  uuid: string
  requesterUserUuid: string
  requesterDisplayName: string
  recipientUserUuid: string
  recipientDisplayName: string
  status: FriendRequestStatus
  createdAt: Date
  respondedAt: Date | null
}

export interface FriendshipRecord {
  uuid: string
  userUuid: string
  friendUserUuid: string
  friendDisplayName: string
  createdAt: Date
}

export interface FriendOverview {
  friends: FriendshipRecord[]
  incomingRequests: FriendRequestRecord[]
  outgoingRequests: FriendRequestRecord[]
}

export interface FriendRepository {
  listFriends(userUuid: string): Promise<FriendshipRecord[]>
  listOverview(userUuid: string): Promise<FriendOverview>
  searchUsers(query: string, userUuid: string, limit?: number): Promise<FriendUserRecord[]>
  sendRequest(
    requesterUserUuid: string,
    recipientUserUuid: string
  ): Promise<Result<FriendRequestRecord>>
  acceptRequest(requestUuid: string, recipientUserUuid: string): Promise<Result<FriendshipRecord>>
  rejectRequest(
    requestUuid: string,
    recipientUserUuid: string
  ): Promise<Result<FriendRequestRecord>>
  cancelRequest(
    requestUuid: string,
    requesterUserUuid: string
  ): Promise<Result<FriendRequestRecord>>
  removeFriend(userUuid: string, friendUserUuid: string): Promise<Result<void>>
}
