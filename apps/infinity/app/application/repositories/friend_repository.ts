import type { Result } from '#shared/result'

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface FriendUserRecord {
  userUuid: string
  fullName: string
  email: string
  isFriend: boolean
  hasIncomingRequest: boolean
  hasOutgoingRequest: boolean
}

export interface FriendRequestRecord {
  uuid: string
  requesterUserUuid: string
  requesterFullName: string
  recipientUserUuid: string
  recipientFullName: string
  status: FriendRequestStatus
  createdAt: Date
  respondedAt: Date | null
}

export interface FriendshipRecord {
  uuid: string
  userUuid: string
  friendUserUuid: string
  friendFullName: string
  friendEmail: string
  createdAt: Date
}

export interface FriendOverview {
  friends: FriendshipRecord[]
  incomingRequests: FriendRequestRecord[]
  outgoingRequests: FriendRequestRecord[]
}

export interface FriendRepository {
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
