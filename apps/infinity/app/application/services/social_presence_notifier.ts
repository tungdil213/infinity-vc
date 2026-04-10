import type { FriendPresenceDTO } from '#application/dtos/friend_presence_dto'

export interface SocialPresenceNotifier {
  notifyFriends(recipientUserUuids: string[], presence: FriendPresenceDTO): Promise<void>
}
