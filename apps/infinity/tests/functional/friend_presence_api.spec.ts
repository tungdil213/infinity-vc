import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import Game from '#domain/entities/game'
import Lobby from '#domain/entities/lobby'
import { DatabaseFriendRepository } from '#infrastructure/repositories/database_friend_repository'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { InMemorySocialPresenceRepository } from '#infrastructure/repositories/in_memory_social_presence_repository'
import User from '#models/user'

async function createUser(userUuid: string, email: string, fullName: string) {
  return User.updateOrCreate(
    { userUuid },
    {
      userUuid,
      fullName,
      email,
      password: 'password123',
    }
  )
}

test.group('Friend presence API', (group) => {
  group.each.setup(async () => {
    const socialPresenceRepository = await app.container.make(InMemorySocialPresenceRepository)
    socialPresenceRepository.clearAll()

    const inMemoryLobbyRepository = await app.container.make(InMemoryLobbyRepository)
    inMemoryLobbyRepository.clear()
  })

  test('shows only friends and reflects online, lobby, game and offline transitions', async ({
    client,
    assert,
  }) => {
    const friendRepository = new DatabaseFriendRepository()
    const socialPresenceRepository = await app.container.make(InMemorySocialPresenceRepository)
    const lobbyRepository = await app.container.make(HybridLobbyService)
    const gameRepository = await app.container.make(DatabaseGameRepository)

    const viewerUserUuid = randomUUID()
    const friendUserUuid = randomUUID()
    const outsiderUserUuid = randomUUID()
    const friendSessionId = randomUUID()

    const viewer = await createUser(
      viewerUserUuid,
      `presence.viewer.${Date.now()}@example.com`,
      'Viewer User'
    )
    const friend = await createUser(
      friendUserUuid,
      `presence.friend.${Date.now()}@example.com`,
      'Friend User'
    )
    const outsider = await createUser(
      outsiderUserUuid,
      `presence.outsider.${Date.now()}@example.com`,
      'Outsider User'
    )

    const sent = await friendRepository.sendRequest(viewerUserUuid, friendUserUuid)
    assert.isTrue(sent.isSuccess)
    const accepted = await friendRepository.acceptRequest(sent.value!.uuid, friendUserUuid)
    assert.isTrue(accepted.isSuccess)

    const initialSnapshot = await client
      .get('/api/v1/friends/presence')
      .loginAs(viewer)
      .withCsrfToken()
    initialSnapshot.assertStatus(200)
    assert.lengthOf(initialSnapshot.body().friends, 1)
    assert.equal(initialSnapshot.body().friends[0].friendUserUuid, friendUserUuid)
    assert.equal(initialSnapshot.body().friends[0].status, 'offline')

    const outsiderHeartbeat = await client
      .post('/api/v1/friends/presence/heartbeat')
      .loginAs(outsider)
      .form({ clientSessionId: randomUUID() })
      .withCsrfToken()
    outsiderHeartbeat.assertStatus(200)

    const onlineHeartbeat = await client
      .post('/api/v1/friends/presence/heartbeat')
      .loginAs(friend)
      .form({ clientSessionId: friendSessionId })
      .withCsrfToken()
    onlineHeartbeat.assertStatus(200)

    const onlineSnapshot = await client
      .get('/api/v1/friends/presence')
      .loginAs(viewer)
      .withCsrfToken()
    onlineSnapshot.assertStatus(200)
    assert.lengthOf(onlineSnapshot.body().friends, 1)
    assert.equal(onlineSnapshot.body().friends[0].status, 'online')

    const lobby = Lobby.create({
      uuid: randomUUID(),
      name: 'Presence Lobby',
      creator: {
        uuid: friendUserUuid,
        nickName: 'Friend User',
      },
      maxPlayers: 4,
      isPrivate: false,
    })
    await lobbyRepository.save(lobby)

    const lobbyHeartbeat = await client
      .post('/api/v1/friends/presence/heartbeat')
      .loginAs(friend)
      .form({ clientSessionId: friendSessionId })
      .withCsrfToken()
    lobbyHeartbeat.assertStatus(200)

    const lobbySnapshot = await client
      .get('/api/v1/friends/presence')
      .loginAs(viewer)
      .withCsrfToken()
    lobbySnapshot.assertStatus(200)
    assert.equal(lobbySnapshot.body().friends[0].status, 'in_lobby')
    assert.equal(lobbySnapshot.body().friends[0].lobbyId, lobby.uuid)
    assert.equal(lobbySnapshot.body().friends[0].lobbyName, lobby.name)

    const game = Game.create({
      uuid: randomUUID(),
      players: [
        { uuid: friendUserUuid, nickName: 'Friend User' },
        { uuid: viewerUserUuid, nickName: 'Viewer User' },
      ],
    })
    game.updateGameData({
      runtime: {
        ...(game.gameData.runtime ?? {}),
        lobbyId: lobby.uuid,
        gameType: 'love-letter',
      },
    })
    await gameRepository.save(game)

    const inGameHeartbeat = await client
      .post('/api/v1/friends/presence/heartbeat')
      .loginAs(friend)
      .form({ clientSessionId: friendSessionId })
      .withCsrfToken()
    inGameHeartbeat.assertStatus(200)

    const gameSnapshot = await client
      .get('/api/v1/friends/presence')
      .loginAs(viewer)
      .withCsrfToken()
    gameSnapshot.assertStatus(200)
    assert.equal(gameSnapshot.body().friends[0].status, 'in_game')
    assert.equal(gameSnapshot.body().friends[0].gameId, game.uuid)

    const offlineResponse = await client
      .post('/api/v1/friends/presence/offline')
      .loginAs(friend)
      .form({ clientSessionId: friendSessionId })
      .withCsrfToken()
    offlineResponse.assertStatus(200)

    const finalSnapshot = await client
      .get('/api/v1/friends/presence')
      .loginAs(viewer)
      .withCsrfToken()
    finalSnapshot.assertStatus(200)
    assert.lengthOf(finalSnapshot.body().friends, 1)
    assert.equal(finalSnapshot.body().friends[0].status, 'offline')

    socialPresenceRepository.clearAll()
  })
})
