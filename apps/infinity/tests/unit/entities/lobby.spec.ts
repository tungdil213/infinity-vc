import { test } from '@japa/runner'
import Lobby from '../../../app/domain/entities/lobby.js'
import { LobbyStatus } from '../../../app/domain/value_objects/lobby_status.js'

// Helper function to create a player interface
function createPlayerInterface() {
  return {
    uuid: crypto.randomUUID(),
    nickName: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
}

// Helper function to create a lobby
function createLobby(overrides = {}) {
  const defaults = {
    name: `Lobby ${Date.now()}`,
    creator: createPlayerInterface(),
    maxPlayers: 4,
    isPrivate: false,
  }
  return Lobby.create({ ...defaults, ...overrides })
}

test.group('Lobby Entity', () => {
  test('should create a lobby with valid data', ({ assert }) => {
    const creator = createPlayerInterface()
    const lobbyData = {
      name: 'Test Lobby',
      creator,
      maxPlayers: 4,
      isPrivate: false,
    }

    const lobby = Lobby.create(lobbyData)

    assert.equal(lobby.name, 'Test Lobby')
    assert.deepEqual(lobby.creator, creator)
    assert.equal(lobby.maxPlayers, 4)
    assert.equal(lobby.isPrivate, false)
    assert.equal(lobby.status, LobbyStatus.WAITING)
    assert.lengthOf(lobby.players, 1)
    assert.deepEqual(lobby.players[0], creator)
    assert.exists(lobby.uuid)
    assert.instanceOf(lobby.createdAt, Date)
  })

  test('should generate a UUID when not provided', ({ assert }) => {
    const lobby = createLobby()
    assert.exists(lobby.uuid)
    assert.equal(typeof lobby.uuid, 'string')
  })

  test('should trim whitespace from name', ({ assert }) => {
    const lobby = Lobby.create({
      name: '  Test Lobby  ',
      creator: createPlayerInterface(),
      maxPlayers: 4,
      isPrivate: false,
    })

    assert.equal(lobby.name, 'Test Lobby')
  })

  test('should throw error for short lobby name', ({ assert }) => {
    assert.throws(() => {
      Lobby.create({
        name: 'ab',
        creator: createPlayerInterface(),
        maxPlayers: 4,
        isPrivate: false,
      })
    }, 'Lobby name must be between 3 and 50 characters')
  })

  test('should throw error for invalid maxPlayers', ({ assert }) => {
    assert.throws(() => {
      Lobby.create({
        name: 'Test Lobby',
        creator: createPlayerInterface(),
        maxPlayers: 1,
        isPrivate: false,
      })
    }, 'Max players must be between 2 and 8')
  })

  test('should throw error for maxPlayers too high', ({ assert }) => {
    assert.throws(() => {
      Lobby.create({
        name: 'Test Lobby',
        creator: createPlayerInterface(),
        maxPlayers: 10,
        isPrivate: false,
      })
    }, 'Max players must be between 2 and 8')
  })

  test('should add player successfully', ({ assert }) => {
    const lobby = createLobby({ maxPlayers: 4 })
    const newPlayer = createPlayerInterface()
    
    const result = lobby.addPlayer(newPlayer)

    assert.isTrue(result.isSuccess)
    assert.lengthOf(lobby.players, 2)
    assert.deepEqual(lobby.players[1], newPlayer)
  })

  test('should not add duplicate player', ({ assert }) => {
    const lobby = createLobby()
    const existingPlayer = lobby.players[0]
    
    const result = lobby.addPlayer(existingPlayer)

    assert.isFalse(result.isSuccess)
    assert.equal(result.error, 'Player is already in the lobby')
    assert.lengthOf(lobby.players, 1)
  })

  test('should not add player when lobby is full', ({ assert }) => {
    const lobby = createLobby({ maxPlayers: 4 })
    
    // Remplir le lobby
    for (let i = 1; i < lobby.maxPlayers; i++) {
      lobby.addPlayer(createPlayerInterface())
    }

    const newPlayer = createPlayerInterface()
    const result = lobby.addPlayer(newPlayer)

    assert.isFalse(result.isSuccess)
    assert.equal(result.error, 'Lobby is full')
    assert.lengthOf(lobby.players, lobby.maxPlayers)
  })

  test('should remove player successfully', ({ assert }) => {
    const lobby = createLobby()
    const newPlayer = createPlayerInterface()
    lobby.addPlayer(newPlayer)

    const result = lobby.removePlayer(newPlayer.uuid)

    assert.isTrue(result.isSuccess)
    assert.lengthOf(lobby.players, 1)
    assert.isUndefined(lobby.players.find((p) => p.uuid === newPlayer.uuid))
  })

  test('should not remove player that is not in lobby', ({ assert }) => {
    const lobby = createLobby()
    const nonExistentPlayer = createPlayerInterface()
    
    const result = lobby.removePlayer(nonExistentPlayer.uuid)

    assert.isFalse(result.isSuccess)
    assert.equal(result.error, 'Player not found in lobby')
  })

  test('should not remove creator when other players exist', ({ assert }) => {
    const lobby = createLobby()
    const newPlayer = createPlayerInterface()
    lobby.addPlayer(newPlayer)

    const result = lobby.removePlayer(lobby.creator.uuid)

    assert.isFalse(result.isSuccess)
    assert.equal(result.error, 'Creator cannot leave lobby while other players are present')
  })

  test('should allow creator to leave when alone', ({ assert }) => {
    const lobby = createLobby()
    
    const result = lobby.removePlayer(lobby.creator.uuid)

    assert.isTrue(result.isSuccess)
    assert.lengthOf(lobby.players, 0)
  })

  test('should check if player is in lobby', ({ assert }) => {
    const lobby = createLobby()
    const newPlayer = createPlayerInterface()

    assert.isTrue(lobby.hasPlayer(lobby.creator.uuid))
    assert.isFalse(lobby.hasPlayer(newPlayer.uuid))

    lobby.addPlayer(newPlayer)
    assert.isTrue(lobby.hasPlayer(newPlayer.uuid))
  })

  test('should update status based on player count', ({ assert }) => {
    const lobby = createLobby({ maxPlayers: 4 })
    // Le lobby a déjà 1 joueur (le créateur), donc statut WAITING
    assert.equal(lobby.status, LobbyStatus.WAITING)

    // Ajouter un joueur pour avoir 2 joueurs total -> READY
    lobby.addPlayer(createPlayerInterface())
    assert.equal(lobby.status, LobbyStatus.READY)

    // Remplir le lobby jusqu'à 4 joueurs -> FULL
    lobby.addPlayer(createPlayerInterface())
    lobby.addPlayer(createPlayerInterface())
    assert.equal(lobby.status, LobbyStatus.FULL)
  })

  test('should allow manual status change to READY', ({ assert }) => {
    const lobby = createLobby()
    lobby.addPlayer(createPlayerInterface())

    const result = lobby.setReady()
    assert.isTrue(result.isSuccess)
    assert.equal(lobby.status, LobbyStatus.READY)
  })

  test('should not allow READY status with only one player', ({ assert }) => {
    const lobby = createLobby()
    
    const result = lobby.setReady()
    assert.isFalse(result.isSuccess)
    assert.equal(result.error, 'Need at least 2 players to be ready')
  })

  test('should transition to STARTING when game starts', ({ assert }) => {
    const lobby = createLobby()
    lobby.addPlayer(createPlayerInterface())
    lobby.setReady()

    const result = lobby.startGame()
    assert.isTrue(result.isSuccess)
    assert.equal(lobby.status, LobbyStatus.STARTING)
  })

  test('should not start game when not ready', ({ assert }) => {
    const lobby = createLobby()
    
    const result = lobby.startGame()
    assert.isFalse(result.isSuccess)
    assert.equal(result.error, 'Lobby must be READY or FULL to start game')
  })

  test('should serialize to JSON correctly', ({ assert }) => {
    const lobby = createLobby({
      name: 'Test Lobby',
      maxPlayers: 4,
      isPrivate: true,
    })
    
    // Add players to test currentPlayers count
    lobby.addPlayer(createPlayerInterface())
    lobby.addPlayer(createPlayerInterface())

    const json = lobby.toJSON()

    assert.equal(json.name, 'Test Lobby')
    assert.deepEqual(json.creator, lobby.creator)
    assert.equal(json.maxPlayers, 4)
    assert.equal(json.currentPlayers, 3)
    assert.equal(json.isPrivate, true)
    assert.equal(json.status, lobby.status)
    assert.exists(json.uuid)
    assert.exists(json.createdAt)
  })

  test('should record events when players join', ({ assert }) => {
    const lobby = createLobby()
    const newPlayer = createPlayerInterface()
    lobby.clearEvents() // Clear creation events

    lobby.addPlayer(newPlayer)

    const events = lobby.getUncommittedEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0].eventType, 'PlayerJoinedLobby')
  })

  test('should record events when players leave', ({ assert }) => {
    const lobby = createLobby()
    const newPlayer = createPlayerInterface()
    lobby.addPlayer(newPlayer)
    lobby.clearEvents() // Clear join event

    lobby.removePlayer(newPlayer.uuid)

    const events = lobby.getUncommittedEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0].eventType, 'PlayerLeftLobby')
  })

  test('should record events when game starts', ({ assert }) => {
    const lobby = createLobby()
    lobby.addPlayer(createPlayerInterface())
    lobby.setReady()
    lobby.clearEvents() // Clear previous events

    lobby.startGame()

    const events = lobby.getUncommittedEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0].eventType, 'GameStarted')
  })
})
