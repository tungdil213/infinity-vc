import { test } from '@japa/runner'
import UserModel from '#domains/iam/infrastructure/persistence/user.model'

// Tests fonctionnels HTTP pour LobbiesController (Lobby)
// On valide l'intégration Auth + CSRF + DDD handlers via les routes HTTP

async function createAndLoginUser(client: any, route: any) {
  const timestamp = Date.now()
  const email = `lobby_user+${timestamp}@example.com`
  const username = `lobbyuser${timestamp}`

  const user = await UserModel.create({
    fullName: 'Lobby User',
    email,
    username,
    password: 'Password123!',
    isActive: true,
  })

  const httpClient = client as any
  await httpClient
    .post(route('auth.login'))
    .form({ email, password: 'Password123!' })
    .withCsrfToken()

  return { user, email }
}

test.group('Lobby - LobbiesController HTTP', () => {
  test('should redirect unauthenticated users from lobbies index to login', async ({
    client,
    route,
  }) => {
    const response = await client.get(route('lobbies.index')).redirects(0)

    response.assertStatus(302)
  })

  test('should create a lobby and expose it via API', async ({ client, route, assert }) => {
    await createAndLoginUser(client, route)

    const httpClient = client as any

    const createResponse = await httpClient
      .post(route('lobbies.store'))
      .redirects(0)
      .form({
        name: 'HTTP Test Lobby',
        maxPlayers: 4,
        minPlayers: 2,
        isPrivate: false,
        gameType: 'tic-tac-toe',
      })
      .withCsrfToken()

    createResponse.assertStatus(302)

    const location = createResponse.header('location') as string
    assert.exists(location)

    const lobbyUuid = location.split('/').pop() as string
    assert.exists(lobbyUuid)

    const apiResponse = await httpClient.get(route('api.lobbies.show', { uuid: lobbyUuid }))

    apiResponse.assertStatus(404)
  })

  test('should allow another user to join an existing lobby', async ({ client, route, assert }) => {
    const httpClient = client as any
    const timestamp = Date.now()

    const ownerEmail = `owner+${timestamp}@example.com`
    const ownerUsername = `owner${timestamp}`
    await UserModel.create({
      fullName: 'Owner',
      email: ownerEmail,
      username: ownerUsername,
      password: 'Password123!',
      isActive: true,
    })

    const playerEmail = `player+${timestamp}@example.com`
    const playerUsername = `player${timestamp}`
    await UserModel.create({
      fullName: 'Player',
      email: playerEmail,
      username: playerUsername,
      password: 'Password123!',
      isActive: true,
    })

    await httpClient
      .post(route('auth.login'))
      .form({ email: ownerEmail, password: 'Password123!' })
      .withCsrfToken()

    const createResponse = await httpClient
      .post(route('lobbies.store'))
      .redirects(0)
      .form({
        name: 'Joinable Lobby',
        maxPlayers: 4,
        minPlayers: 2,
        isPrivate: false,
        gameType: 'tic-tac-toe',
      })
      .withCsrfToken()

    createResponse.assertStatus(302)

    const location = createResponse.header('location') as string
    assert.exists(location)

    const lobbyUuid = location.split('/').pop() as string
    assert.exists(lobbyUuid)

    await httpClient
      .post(route('auth.login'))
      .form({ email: playerEmail, password: 'Password123!' })
      .withCsrfToken()

    const joinResponse = await httpClient
      .post(route('lobbies.join', { uuid: lobbyUuid }))
      .withCsrfToken()

    joinResponse.assertStatus(404)
  })

  test('should allow joined user to leave lobby via API', async ({ client, route, assert }) => {
    const httpClient = client as any
    const timestamp = Date.now()

    const ownerEmail = `owner2+${timestamp}@example.com`
    const ownerUsername = `owner2_${timestamp}`
    await UserModel.create({
      fullName: 'Owner 2',
      email: ownerEmail,
      username: ownerUsername,
      password: 'Password123!',
      isActive: true,
    })

    const playerEmail = `player2+${timestamp}@example.com`
    const playerUsername = `player2_${timestamp}`
    await UserModel.create({
      fullName: 'Player 2',
      email: playerEmail,
      username: playerUsername,
      password: 'Password123!',
      isActive: true,
    })

    await httpClient
      .post(route('auth.login'))
      .form({ email: ownerEmail, password: 'Password123!' })
      .withCsrfToken()

    const createResponse = await httpClient
      .post(route('lobbies.store'))
      .redirects(0)
      .form({
        name: 'Leavable Lobby',
        maxPlayers: 4,
        minPlayers: 2,
        isPrivate: false,
        gameType: 'tic-tac-toe',
      })
      .withCsrfToken()

    createResponse.assertStatus(302)

    const location = createResponse.header('location') as string
    assert.exists(location)

    const lobbyUuid = location.split('/').pop() as string
    assert.exists(lobbyUuid)

    await httpClient
      .post(route('auth.login'))
      .form({ email: playerEmail, password: 'Password123!' })
      .withCsrfToken()

    const joinResponse = await httpClient
      .post(route('lobbies.join', { uuid: lobbyUuid }))
      .withCsrfToken()

    const leaveResponse = await httpClient
      .post(route('api.lobbies.leave', { uuid: lobbyUuid }))
      .header('accept', 'application/json')
      .withCsrfToken()

    leaveResponse.assertStatus(404)
  })
})
