import { ModuleEvent, ModuleEventFactory } from '../../base/module_event.js'

/**
 * Types d'événements pour le module chat
 */
export const CHAT_EVENT_TYPES = {
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELETED: 'message.deleted',
  USER_TYPING: 'user.typing',
  USER_JOINED: 'user.joined',
  USER_LEFT: 'user.left',
} as const

/**
 * Données pour l'événement de message envoyé
 */
export interface ChatMessageSentData {
  channelId: string
  messageId: string
  content: string
  authorUuid: string
  authorName: string
  timestamp: Date
}

/**
 * Données pour l'événement utilisateur en train d'écrire
 */
export interface ChatUserTypingData {
  channelId: string
  userUuid: string
  userName: string
}

/**
 * Factory pour créer les événements du module chat
 */
export class ChatEventFactory {
  static messageSent(
    data: ChatMessageSentData,
    userUuid?: string
  ): ModuleEvent<ChatMessageSentData> {
    return ModuleEventFactory.create('chat', CHAT_EVENT_TYPES.MESSAGE_SENT, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['chat', 'message'],
    })
  }

  static userTyping(data: ChatUserTypingData, userUuid?: string): ModuleEvent<ChatUserTypingData> {
    return ModuleEventFactory.create('chat', CHAT_EVENT_TYPES.USER_TYPING, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['chat', 'typing'],
    })
  }
}
