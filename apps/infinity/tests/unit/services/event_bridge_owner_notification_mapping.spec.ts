import { createEventBus, type IEvent } from '@infinity.dev/events'
import { registerDefaultInfinityMappings } from '@infinity.dev/transcript-adonis'
import {
  createEventBridge,
  type ITranscriptService,
  type TranscriptServiceStats,
} from '@infinity.dev/transcript/server'
import { test } from '@japa/runner'
import type { IChannel } from '@infinity.dev/transcript'

type BroadcastRecord = {
  channel: string
  eventType: string
  payload: unknown
}

class RecordingTranscriptService implements ITranscriptService {
  broadcasts: BroadcastRecord[] = []

  async initialize(): Promise<void> {}

  registerChannel(_channel: IChannel): void {}

  async broadcast<TPayload>(channel: string, type: string, payload: TPayload): Promise<void> {
    this.broadcasts.push({ channel, eventType: type, payload })
  }

  async sendToConnection<TPayload>(
    _connectionId: string,
    _type: string,
    _payload: TPayload
  ): Promise<void> {}

  async sendToUser<TPayload>(_userId: string, _type: string, _payload: TPayload): Promise<void> {}

  getSubscriberCount(_channel: string): number {
    return 0
  }

  getActiveChannels(): string[] {
    return []
  }

  getStats(): TranscriptServiceStats {
    return {
      activeConnections: 0,
      activeChannels: 0,
      totalMessagesSent: this.broadcasts.length,
      connectionsByUser: new Map(),
    }
  }

  async destroy(): Promise<void> {}
}

test.group('Event bridge owner notification mapping', () => {
  test('routes LobbyOwnerLobbyFull to users/{ownerUuid}', async ({ assert }) => {
    const eventBus = createEventBus()
    const transcript = new RecordingTranscriptService()
    const builder = createEventBridge()
    registerDefaultInfinityMappings(builder)
    const bridge = builder.build(eventBus, transcript)
    bridge.start()

    const event: IEvent = {
      id: crypto.randomUUID(),
      type: 'LobbyOwnerLobbyFull',
      timestamp: new Date(),
      payload: {
        lobbyUuid: 'lobby-123',
        ownerUuid: 'owner-123',
        lobbyName: 'Private Lobby',
        currentPlayers: 4,
        maxPlayers: 4,
      },
    }

    await eventBus.publish(event)

    assert.lengthOf(transcript.broadcasts, 1)
    assert.equal(transcript.broadcasts[0].channel, 'users/owner-123')
    assert.equal(transcript.broadcasts[0].eventType, 'LobbyOwnerLobbyFull')
    assert.equal((transcript.broadcasts[0].payload as any).type, 'lobby.owner.full')

    bridge.stop()
  })

  test('routes FriendPresenceUpdated to each friend user channel', async ({ assert }) => {
    const eventBus = createEventBus()
    const transcript = new RecordingTranscriptService()
    const builder = createEventBridge()
    registerDefaultInfinityMappings(builder)
    const bridge = builder.build(eventBus, transcript)
    bridge.start()

    const event: IEvent = {
      id: crypto.randomUUID(),
      type: 'FriendPresenceUpdated',
      timestamp: new Date(),
      payload: {
        recipientUserUuids: ['friend-1', 'friend-2'],
        presence: {
          friendUserUuid: 'actor-1',
          displayName: 'Actor User',
          status: 'in_lobby',
          lobbyId: 'lobby-123',
          lobbyName: 'Strategy Room',
          gameId: null,
          updatedAt: new Date().toISOString(),
        },
      },
    }

    await eventBus.publish(event)

    assert.lengthOf(transcript.broadcasts, 2)
    assert.equal(transcript.broadcasts[0].channel, 'users/friend-1')
    assert.equal(transcript.broadcasts[1].channel, 'users/friend-2')
    assert.equal((transcript.broadcasts[0].payload as any).type, 'social.presence.updated')
    assert.equal((transcript.broadcasts[0].payload as any).presence.friendUserUuid, 'actor-1')
    assert.notProperty((transcript.broadcasts[0].payload as any).presence, 'email')
    assert.notInclude(
      JSON.stringify((transcript.broadcasts[0].payload as any).presence),
      '@example.com'
    )

    bridge.stop()
  })
})
