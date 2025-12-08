import { test } from '@japa/runner'
import Lobby from '../../../domain/entities/lobby.js'
import { LobbyStatus } from '../../../domain/value_objects/lobby_status.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'
import { PlayerFactory } from '../../factories/player_factory.js'

test.group('Lobby Entity', () => {
  test.group('creation', () => {
    test('should create a lobby with valid data', ({ assert }) => {
      const creator = PlayerFactory.createPlayerInterface()
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
      assert.equal(lobby.status, LobbyStatus.OPEN)
      assert.lengthOf(lobby.players, 1)
      assert.deepEqual(lobby.players[0], creator)
      assert.exists(lobby.uuid)
      assert.instanceOf(lobby.createdAt, Date)
    })

    test('should generate a UUID when not provided', ({ assert }) => {
      const lobby = LobbyFactory.create()
      assert.exists(lobby.uuid)
      assert.equal(typeof lobby.uuid, 'string')
    })

    test('should trim whitespace from name', ({ assert }) => {
      const lobby = Lobby.create({
        name: '  Test Lobby  ',
        creator: PlayerFactory.createPlayerInterface(),
        maxPlayers: 4,
        isPrivate: false,
      })

      assert.equal(lobby.name, 'Test Lobby')
    })
  })

  test.group('validation', () => {
    test('should throw error for short lobby name', ({ assert }) => {
      assert.throws(() => {
        Lobby.create({
          name: 'ab',
          creator: PlayerFactory.createPlayerInterface(),
          maxPlayers: 4,
          isPrivate: false,
        })
      }, 'Lobby name must be between 3 and 50 characters')
    })

    test('should throw error for invalid maxPlayers', ({ assert }) => {
      assert.throws(() => {
        Lobby.create({
          name: 'Test Lobby',
          creator: PlayerFactory.createPlayerInterface(),
          maxPlayers: 1,
          isPrivate: false,
        })
      }, 'Max players must be between 2 and 8')
    })

    test('should throw error for maxPlayers too high', ({ assert }) => {
      assert.throws(() => {
        Lobby.create({
          name: 'Test Lobby',
          creator: PlayerFactory.createPlayerInterface(),
          maxPlayers: 10,
          isPrivate: false,
        })
      }, 'Max players must be between 2 and 8')
    })
  })

  test.group('player management', (group) => {
    let lobby: Lobby

    group.setup(() => {
      lobby = LobbyFactory.create({ maxPlayers: 4 })
    })

    test('should add player successfully', ({ assert }) => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      const result = lobby.addPlayer(newPlayer)

      assert.equal(result.isSuccess, true)
      assert.lengthOf(lobby.players, 2)
      assert.deepEqual(lobby.players[1], newPlayer)
    })

    test('should not add duplicate player', ({ assert }) => {
      const existingPlayer = lobby.players[0]
      const result = lobby.addPlayer(existingPlayer)

      assert.equal(result.isFailure, true)
      assert.equal(result.error, 'Player is already in the lobby')
      assert.lengthOf(lobby.players, 1)
    })

    test('should not add player when lobby is full', ({ assert }) => {
      // Remplir le lobby
      for (let i = 1; i < lobby.maxPlayers; i++) {
        lobby.addPlayer(PlayerFactory.createPlayerInterface())
      }

      const newPlayer = PlayerFactory.createPlayerInterface()
      const result = lobby.addPlayer(newPlayer)

      assert.equal(result.isFailure, true)
      assert.equal(result.error, 'Lobby is full')
      assert.lengthOf(lobby.players, lobby.maxPlayers)
    })

    test('should remove player successfully', ({ assert }) => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      lobby.addPlayer(newPlayer)

      const result = lobby.removePlayer(newPlayer.uuid)

      assert.equal(result.isSuccess, true)
      assert.lengthOf(lobby.players, 1)
      assert.isUndefined(lobby.players.find((p) => p.uuid === newPlayer.uuid))
    })

    test('should not remove player that is not in lobby', ({ assert }) => {
      const nonExistentPlayer = PlayerFactory.createPlayerInterface()
      const result = lobby.removePlayer(nonExistentPlayer.uuid)

      assert.equal(result.isFailure, true)
      assert.equal(result.error, 'Player not found in lobby')
    })

    test('should not remove creator when other players exist', ({ assert }) => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      lobby.addPlayer(newPlayer)

      const result = lobby.removePlayer(lobby.creator.uuid)

      assert.equal(result.isFailure, true)
      assert.equal(result.error, 'Creator cannot leave lobby while other players are present')
    })

    test('should allow creator to leave when alone', ({ assert }) => {
      const result = lobby.removePlayer(lobby.creator.uuid)

      assert.equal(result.isSuccess, true)
      assert.lengthOf(lobby.players, 0)
    })

    test('should check if player is in lobby', ({ assert }) => {
      const newPlayer = PlayerFactory.createPlayerInterface()

      assert.equal(lobby.hasPlayer(lobby.creator.uuid), true)
      assert.equal(lobby.hasPlayer(newPlayer.uuid), false)

      lobby.addPlayer(newPlayer)
      assert.equal(lobby.hasPlayer(newPlayer.uuid), true)
    })
  })

  test.group('status management', (group) => {
    let lobby: Lobby

    group.setup(() => {
      lobby = LobbyFactory.create({ maxPlayers: 4 })
    })

    test('should update status based on player count', ({ assert }) => {
      assert.equal(lobby.status, LobbyStatus.OPEN)

      // Ajouter des joueurs jusqu'à être prêt
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      assert.equal(lobby.status, LobbyStatus.WAITING)

      // Remplir le lobby
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      assert.equal(lobby.status, LobbyStatus.FULL)
    })

    test('should allow manual status change to READY', ({ assert }) => {
      lobby.addPlayer(PlayerFactory.createPlayerInterface())

      const result = lobby.setReady()
      assert.equal(result.isSuccess, true)
      assert.equal(lobby.status, LobbyStatus.READY)
    })

    test('should not allow READY status with only one player', ({ assert }) => {
      const result = lobby.setReady()
      assert.equal(result.isFailure, true)
      assert.equal(result.error, 'Need at least 2 players to be ready')
    })

    test('should transition to STARTING when game starts', ({ assert }) => {
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      lobby.setReady()

      const result = lobby.startGame()
      assert.equal(result.isSuccess, true)
      assert.equal(lobby.status, LobbyStatus.STARTING)
    })

    test('should not start game when not ready', ({ assert }) => {
      const result = lobby.startGame()
      assert.equal(result.isFailure, true)
      assert.equal(result.error, 'Lobby must be READY or FULL to start game')
    })
  })

  test.group('serialization', () => {
    test('should serialize to JSON correctly', ({ assert }) => {
      const lobby = LobbyFactory.createWithPlayers(3, {
        name: 'Test Lobby',
        maxPlayers: 4,
        isPrivate: true,
      })

      const json = lobby.toJSON()

      assert.deepEqual(json, {
        uuid: lobby.uuid,
        name: 'Test Lobby',
        creator: lobby.creator,
        players: lobby.players,
        maxPlayers: 4,
        currentPlayers: 3,
        isPrivate: true,
        status: lobby.status,
        createdAt: lobby.createdAt,
      })
    })
  })

  test.group('domain events', (group) => {
    let lobby: Lobby

    group.setup(() => {
      lobby = LobbyFactory.create()
    })

    test('should record events when players join', ({ assert }) => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      lobby.clearEvents() // Clear creation events

      lobby.addPlayer(newPlayer)

      const events = lobby.getUncommittedEvents()
      assert.lengthOf(events, 1)
      assert.equal(events[0].eventType, 'PlayerJoinedLobby')
    })

    test('should record events when players leave', ({ assert }) => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      lobby.addPlayer(newPlayer)
      lobby.clearEvents() // Clear join event

      lobby.removePlayer(newPlayer.uuid)

      const events = lobby.getUncommittedEvents()
      assert.lengthOf(events, 1)
      assert.equal(events[0].eventType, 'PlayerLeftLobby')
    })

    test('should record events when game starts', ({ assert }) => {
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      lobby.setReady()
      lobby.clearEvents() // Clear previous events

      lobby.startGame()

      const events = lobby.getUncommittedEvents()
      assert.lengthOf(events, 1)
      assert.equal(events[0].eventType, 'GameStarted')
    })
  })
})
