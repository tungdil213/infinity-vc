import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import { ClearSocialPresenceUseCase } from '#application/use_cases/clear_social_presence_use_case'
import { HeartbeatSocialPresenceUseCase } from '#application/use_cases/heartbeat_social_presence_use_case'
import { ListFriendPresenceUseCase } from '#application/use_cases/list_friend_presence_use_case'
import { DatabaseFriendRepository } from '#infrastructure/repositories/database_friend_repository'
import { InMemorySocialPresenceRepository } from '#infrastructure/repositories/in_memory_social_presence_repository'
import User from '#models/user'
import { Result } from '#shared/result'
import type { FriendPresenceDTO } from '#application/dtos/friend_presence_dto'
import type {
  SocialPresenceContext,
  SocialPresenceContextResolver,
} from '#application/services/social_presence_context_resolver'
import type { SocialPresenceNotifier } from '#application/services/social_presence_notifier'

class FakeSocialPresenceContextResolver implements SocialPresenceContextResolver {
  private contexts = new Map<string, SocialPresenceContext>()

  set(userUuid: string, context: SocialPresenceContext) {
    this.contexts.set(userUuid, context)
  }

  async resolve(userUuid: string) {
    const fallbackContext: SocialPresenceContext = {
      status: 'online',
      lobbyId: null,
      lobbyName: null,
      gameId: null,
    }

    return Result.ok(this.contexts.get(userUuid) ?? fallbackContext)
  }
}

class RecordingSocialPresenceNotifier implements SocialPresenceNotifier {
  readonly notifications: Array<{
    recipients: string[]
    presence: FriendPresenceDTO
  }> = []

  async notifyFriends(recipientUserUuids: string[], presence: FriendPresenceDTO): Promise<void> {
    this.notifications.push({
      recipients: [...recipientUserUuids],
      presence,
    })
  }
}

async function createUser(userUuid: string, email: string, fullName: string) {
  await User.updateOrCreate(
    { userUuid },
    {
      userUuid,
      fullName,
      email,
      password: 'password123',
    }
  )
}

test.group('SocialPresence use cases', (group) => {
  const friendRepository = new DatabaseFriendRepository()
  const socialPresenceRepository = new InMemorySocialPresenceRepository()
  const resolver = new FakeSocialPresenceContextResolver()
  const notifier = new RecordingSocialPresenceNotifier()

  group.each.setup(async () => {
    socialPresenceRepository.clearAll()
    notifier.notifications.length = 0
  })

  test('joins friend relationships with presence transitions from online to offline', async ({
    assert,
  }) => {
    const viewerUserUuid = randomUUID()
    const friendUserUuid = randomUUID()

    await createUser(viewerUserUuid, `presence.viewer.${Date.now()}@example.com`, 'Viewer User')
    await createUser(friendUserUuid, `presence.friend.${Date.now()}@example.com`, 'Friend User')

    const sent = await friendRepository.sendRequest(viewerUserUuid, friendUserUuid)
    assert.isTrue(sent.isSuccess)
    const accepted = await friendRepository.acceptRequest(sent.value!.uuid, friendUserUuid)
    assert.isTrue(accepted.isSuccess)

    const heartbeatUseCase = new HeartbeatSocialPresenceUseCase(
      friendRepository,
      socialPresenceRepository,
      resolver,
      notifier
    )
    const clearUseCase = new ClearSocialPresenceUseCase(
      friendRepository,
      socialPresenceRepository,
      resolver,
      notifier
    )
    const listUseCase = new ListFriendPresenceUseCase(friendRepository, socialPresenceRepository)

    resolver.set(friendUserUuid, {
      status: 'online',
      lobbyId: null,
      lobbyName: null,
      gameId: null,
    })

    const onlineResult = await heartbeatUseCase.execute({
      userUuid: friendUserUuid,
      displayName: 'Friend User',
      clientSessionId: 'session-1',
    })

    assert.isTrue(onlineResult.isSuccess)
    assert.equal(onlineResult.value!.status, 'online')

    resolver.set(friendUserUuid, {
      status: 'in_lobby',
      lobbyId: 'lobby-123',
      lobbyName: 'Strategy Room',
      gameId: null,
    })

    const inLobbyResult = await heartbeatUseCase.execute({
      userUuid: friendUserUuid,
      displayName: 'Friend User',
      clientSessionId: 'session-1',
    })

    assert.isTrue(inLobbyResult.isSuccess)
    assert.equal(inLobbyResult.value!.status, 'in_lobby')
    assert.equal(inLobbyResult.value!.lobbyId, 'lobby-123')

    resolver.set(friendUserUuid, {
      status: 'in_game',
      lobbyId: 'lobby-123',
      lobbyName: 'Strategy Room',
      gameId: 'game-987',
    })

    const inGameResult = await heartbeatUseCase.execute({
      userUuid: friendUserUuid,
      displayName: 'Friend User',
      clientSessionId: 'session-1',
    })

    assert.isTrue(inGameResult.isSuccess)
    assert.equal(inGameResult.value!.status, 'in_game')
    assert.equal(inGameResult.value!.gameId, 'game-987')

    const offlineResult = await clearUseCase.execute({
      userUuid: friendUserUuid,
      displayName: 'Friend User',
      clientSessionId: 'session-1',
    })

    assert.isTrue(offlineResult.isSuccess)
    assert.equal(offlineResult.value!.status, 'offline')

    const snapshot = await listUseCase.execute(viewerUserUuid)
    assert.isTrue(snapshot.isSuccess)
    assert.lengthOf(snapshot.value!.friends, 1)
    assert.equal(snapshot.value!.friends[0].friendUserUuid, friendUserUuid)
    assert.equal(snapshot.value!.friends[0].status, 'offline')

    assert.deepEqual(
      notifier.notifications.map((entry) => entry.presence.status),
      ['online', 'in_lobby', 'in_game', 'offline']
    )
    assert.deepEqual(notifier.notifications[0].recipients, [viewerUserUuid])
    assert.equal(notifier.notifications[0].presence.displayName, 'Friend User')
    assert.notProperty(notifier.notifications[0].presence, 'email')
  })
})
