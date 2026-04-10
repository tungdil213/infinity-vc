import { test } from '@japa/runner'
import { InMemorySocialPresenceRepository } from '#infrastructure/repositories/in_memory_social_presence_repository'

test.group('InMemorySocialPresenceRepository', (group) => {
  let repository: InMemorySocialPresenceRepository

  group.each.setup(() => {
    repository = new InMemorySocialPresenceRepository()
    repository.clearAll()
  })

  group.each.teardown(() => {
    repository.clearAll()
  })

  test('stores online presence while at least one session remains active', async ({ assert }) => {
    await repository.touchSession('user-1', 'session-a')
    await repository.touchSession('user-1', 'session-b')

    await repository.savePresence({
      userUuid: 'user-1',
      displayName: 'User One',
      status: 'online',
      lobbyId: null,
      lobbyName: null,
      gameId: null,
      updatedAt: new Date(),
    })

    await repository.removeSession('user-1', 'session-a')
    const presence = await repository.getPresence('user-1')

    assert.exists(presence)
    assert.equal(presence!.status, 'online')
  })

  test('marks a user offline once the last session is removed', async ({ assert }) => {
    await repository.touchSession('user-2', 'session-a')

    await repository.savePresence({
      userUuid: 'user-2',
      displayName: 'User Two',
      status: 'in_lobby',
      lobbyId: 'lobby-1',
      lobbyName: 'Lobby 1',
      gameId: null,
      updatedAt: new Date(),
    })

    await repository.removeSession('user-2', 'session-a')
    const presence = await repository.getPresence('user-2')

    assert.exists(presence)
    assert.equal(presence!.status, 'offline')
    assert.isNull(presence!.lobbyId)
    assert.isNull(presence!.gameId)
  })
})
