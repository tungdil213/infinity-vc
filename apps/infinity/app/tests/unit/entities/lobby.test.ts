import { describe, it, expect, beforeEach } from '@jest/globals'
import Lobby from '../../../domain/entities/lobby.js'
import { LobbyStatus } from '../../../domain/value_objects/lobby_status.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'
import { PlayerFactory } from '../../factories/player_factory.js'

describe('Lobby Entity', () => {
  describe('creation', () => {
    it('should create a lobby with valid data', () => {
      const creator = PlayerFactory.createPlayerInterface()
      const lobbyData = {
        name: 'Test Lobby',
        creator,
        maxPlayers: 4,
        isPrivate: false,
      }

      const lobby = Lobby.create(lobbyData)

      expect(lobby.name).toBe('Test Lobby')
      expect(lobby.creator).toEqual(creator)
      expect(lobby.maxPlayers).toBe(4)
      expect(lobby.isPrivate).toBe(false)
      expect(lobby.status).toBe(LobbyStatus.OPEN)
      expect(lobby.players).toHaveLength(1)
      expect(lobby.players[0]).toEqual(creator)
      expect(lobby.uuid).toBeDefined()
      expect(lobby.createdAt).toBeInstanceOf(Date)
    })

    it('should generate a UUID when not provided', () => {
      const lobby = LobbyFactory.create()
      expect(lobby.uuid).toBeDefined()
      expect(typeof lobby.uuid).toBe('string')
    })

    it('should trim whitespace from name', () => {
      const lobby = Lobby.create({
        name: '  Test Lobby  ',
        creator: PlayerFactory.createPlayerInterface(),
        maxPlayers: 4,
        isPrivate: false,
      })

      expect(lobby.name).toBe('Test Lobby')
    })
  })

  describe('validation', () => {
    it('should throw error for short lobby name', () => {
      expect(() => {
        Lobby.create({
          name: 'ab',
          creator: PlayerFactory.createPlayerInterface(),
          maxPlayers: 4,
          isPrivate: false,
        })
      }).toThrow('Lobby name must be between 3 and 50 characters')
    })

    it('should throw error for invalid maxPlayers', () => {
      expect(() => {
        Lobby.create({
          name: 'Test Lobby',
          creator: PlayerFactory.createPlayerInterface(),
          maxPlayers: 1,
          isPrivate: false,
        })
      }).toThrow('Max players must be between 2 and 8')
    })

    it('should throw error for maxPlayers too high', () => {
      expect(() => {
        Lobby.create({
          name: 'Test Lobby',
          creator: PlayerFactory.createPlayerInterface(),
          maxPlayers: 10,
          isPrivate: false,
        })
      }).toThrow('Max players must be between 2 and 8')
    })
  })

  describe('player management', () => {
    let lobby: Lobby

    beforeEach(() => {
      lobby = LobbyFactory.create({ maxPlayers: 4 })
    })

    it('should add player successfully', () => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      const result = lobby.addPlayer(newPlayer)

      expect(result.isSuccess).toBe(true)
      expect(lobby.players).toHaveLength(2)
      expect(lobby.players[1]).toEqual(newPlayer)
    })

    it('should not add duplicate player', () => {
      const existingPlayer = lobby.players[0]
      const result = lobby.addPlayer(existingPlayer)

      expect(result.isFailure).toBe(true)
      expect(result.error).toBe('Player is already in the lobby')
      expect(lobby.players).toHaveLength(1)
    })

    it('should not add player when lobby is full', () => {
      // Remplir le lobby
      for (let i = 1; i < lobby.maxPlayers; i++) {
        lobby.addPlayer(PlayerFactory.createPlayerInterface())
      }

      const newPlayer = PlayerFactory.createPlayerInterface()
      const result = lobby.addPlayer(newPlayer)

      expect(result.isFailure).toBe(true)
      expect(result.error).toBe('Lobby is full')
      expect(lobby.players).toHaveLength(lobby.maxPlayers)
    })

    it('should remove player successfully', () => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      lobby.addPlayer(newPlayer)

      const result = lobby.removePlayer(newPlayer.uuid)

      expect(result.isSuccess).toBe(true)
      expect(lobby.players).toHaveLength(1)
      expect(lobby.players.find((p) => p.uuid === newPlayer.uuid)).toBeUndefined()
    })

    it('should not remove player that is not in lobby', () => {
      const nonExistentPlayer = PlayerFactory.createPlayerInterface()
      const result = lobby.removePlayer(nonExistentPlayer.uuid)

      expect(result.isFailure).toBe(true)
      expect(result.error).toBe('Player not found in lobby')
    })

    it('should not remove creator when other players exist', () => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      lobby.addPlayer(newPlayer)

      const result = lobby.removePlayer(lobby.creator.uuid)

      expect(result.isFailure).toBe(true)
      expect(result.error).toBe('Creator cannot leave lobby while other players are present')
    })

    it('should allow creator to leave when alone', () => {
      const result = lobby.removePlayer(lobby.creator.uuid)

      expect(result.isSuccess).toBe(true)
      expect(lobby.players).toHaveLength(0)
    })

    it('should check if player is in lobby', () => {
      const newPlayer = PlayerFactory.createPlayerInterface()

      expect(lobby.hasPlayer(lobby.creator.uuid)).toBe(true)
      expect(lobby.hasPlayer(newPlayer.uuid)).toBe(false)

      lobby.addPlayer(newPlayer)
      expect(lobby.hasPlayer(newPlayer.uuid)).toBe(true)
    })
  })

  describe('status management', () => {
    let lobby: Lobby

    beforeEach(() => {
      lobby = LobbyFactory.create({ maxPlayers: 4 })
    })

    it('should update status based on player count', () => {
      expect(lobby.status).toBe(LobbyStatus.OPEN)

      // Ajouter des joueurs jusqu'à être prêt
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      expect(lobby.status).toBe(LobbyStatus.WAITING)

      // Remplir le lobby
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      expect(lobby.status).toBe(LobbyStatus.FULL)
    })

    it('should allow manual status change to READY', () => {
      lobby.addPlayer(PlayerFactory.createPlayerInterface())

      const result = lobby.setReady()
      expect(result.isSuccess).toBe(true)
      expect(lobby.status).toBe(LobbyStatus.READY)
    })

    it('should not allow READY status with only one player', () => {
      const result = lobby.setReady()
      expect(result.isFailure).toBe(true)
      expect(result.error).toBe('Need at least 2 players to be ready')
    })

    it('should transition to STARTING when game starts', () => {
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      lobby.setReady()

      const result = lobby.startGame()
      expect(result.isSuccess).toBe(true)
      expect(lobby.status).toBe(LobbyStatus.STARTING)
    })

    it('should not start game when not ready', () => {
      const result = lobby.startGame()
      expect(result.isFailure).toBe(true)
      expect(result.error).toBe('Lobby must be READY or FULL to start game')
    })
  })

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const lobby = LobbyFactory.createWithPlayers(3, {
        name: 'Test Lobby',
        maxPlayers: 4,
        isPrivate: true,
      })

      const json = lobby.toJSON()

      expect(json).toEqual({
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

  describe('domain events', () => {
    let lobby: Lobby

    beforeEach(() => {
      lobby = LobbyFactory.create()
    })

    it('should record events when players join', () => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      lobby.clearEvents() // Clear creation events

      lobby.addPlayer(newPlayer)

      const events = lobby.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('PlayerJoinedLobby')
    })

    it('should record events when players leave', () => {
      const newPlayer = PlayerFactory.createPlayerInterface()
      lobby.addPlayer(newPlayer)
      lobby.clearEvents() // Clear join event

      lobby.removePlayer(newPlayer.uuid)

      const events = lobby.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('PlayerLeftLobby')
    })

    it('should record events when game starts', () => {
      lobby.addPlayer(PlayerFactory.createPlayerInterface())
      lobby.setReady()
      lobby.clearEvents() // Clear previous events

      lobby.startGame()

      const events = lobby.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('GameStarted')
    })
  })
})
