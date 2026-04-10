import logger from '@adonisjs/core/services/logger'
import { eventBus } from '#infrastructure/events/event_bus'
import type { FriendPresenceDTO } from '#application/dtos/friend_presence_dto'
import type { SocialPresenceNotifier } from '#application/services/social_presence_notifier'

export class EventBusSocialPresenceNotifier implements SocialPresenceNotifier {
  async notifyFriends(recipientUserUuids: string[], presence: FriendPresenceDTO): Promise<void> {
    const uniqueRecipients = [...new Set(recipientUserUuids)].filter(Boolean)
    if (uniqueRecipients.length === 0) {
      return
    }

    try {
      await eventBus.publish({
        id: crypto.randomUUID(),
        type: 'FriendPresenceUpdated',
        timestamp: new Date(),
        payload: {
          recipientUserUuids: uniqueRecipients,
          presence: {
            ...presence,
            updatedAt: presence.updatedAt.toISOString(),
          },
        },
      })

      logger.debug(
        {
          friendUserUuid: presence.friendUserUuid,
          status: presence.status,
          recipients: uniqueRecipients.length,
        },
        '[SocialPresenceNotifier] Published FriendPresenceUpdated'
      )
    } catch (error) {
      logger.warn(
        {
          friendUserUuid: presence.friendUserUuid,
          status: presence.status,
          recipients: uniqueRecipients.length,
          error,
        },
        '[SocialPresenceNotifier] Failed to publish FriendPresenceUpdated'
      )
    }
  }
}
