import { describe, it, expect, beforeEach } from '@jest/globals'
import Player from '../../../domain/entities/player.js'
import { PlayerFactory } from '../../factories/player_factory.js'

describe('Player Entity', () => {
  describe('creation', () => {
    it('should create a player with valid data', () => {
      const playerData = {
        userUuid: crypto.randomUUID(),
        nickName: 'TestPlayer',
      }

      const player = Player.create(playerData)

      expect(player.userUuid).toBe(playerData.userUuid)
      expect(player.nickName).toBe('TestPlayer')
      expect(player.gamesPlayed).toBe(0)
      expect(player.gamesWon).toBe(0)
      expect(player.winRate).toBe(0)
      expect(player.uuid).toBeDefined()
      expect(player.createdAt).toBeInstanceOf(Date)
    })

    it('should generate a UUID when not provided', () => {
      const player = PlayerFactory.create()
      expect(player.uuid).toBeDefined()
      expect(typeof player.uuid).toBe('string')
    })

    it('should trim whitespace from nickName', () => {
      const player = Player.create({
        userUuid: crypto.randomUUID(),
        nickName: '  TestPlayer  ',
      })

      expect(player.nickName).toBe('TestPlayer')
    })

    it('should initialize with provided stats', () => {
      const player = Player.create({
        userUuid: crypto.randomUUID(),
        nickName: 'TestPlayer',
        gamesPlayed: 10,
        gamesWon: 7,
      })

      expect(player.gamesPlayed).toBe(10)
      expect(player.gamesWon).toBe(7)
      expect(player.winRate).toBe(0.7)
    })
  })

  describe('validation', () => {
    it('should throw error for invalid userUuid', () => {
      expect(() => {
        Player.create({
          userUuid: 'invalid-uuid',
          nickName: 'TestPlayer',
        })
      }).toThrow('Invalid user UUID format')
    })

    it('should throw error for short nickName', () => {
      expect(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'ab',
        })
      }).toThrow('Nickname must be between 3 and 30 characters')
    })

    it('should throw error for long nickName', () => {
      expect(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'a'.repeat(31),
        })
      }).toThrow('Nickname must be between 3 and 30 characters')
    })

    it('should throw error for nickName with invalid characters', () => {
      expect(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'Test@Player',
        })
      }).toThrow('Nickname can only contain letters, numbers, spaces, underscores and hyphens')
    })

    it('should throw error for negative gamesPlayed', () => {
      expect(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'TestPlayer',
          gamesPlayed: -1,
        })
      }).toThrow('Games played cannot be negative')
    })

    it('should throw error for negative gamesWon', () => {
      expect(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'TestPlayer',
          gamesWon: -1,
        })
      }).toThrow('Games won cannot be negative')
    })

    it('should throw error when gamesWon exceeds gamesPlayed', () => {
      expect(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'TestPlayer',
          gamesPlayed: 5,
          gamesWon: 7,
        })
      }).toThrow('Games won cannot exceed games played')
    })
  })

  describe('methods', () => {
    let player: Player

    beforeEach(() => {
      player = PlayerFactory.create({
        gamesPlayed: 10,
        gamesWon: 6,
      })
    })

    it('should update nickname', () => {
      player.updateNickName('NewNickName')

      expect(player.nickName).toBe('NewNickName')
    })

    it('should throw error when updating to invalid nickname', () => {
      expect(() => {
        player.updateNickName('ab')
      }).toThrow('Nickname must be between 3 and 30 characters')
    })

    it('should record game win', () => {
      const initialPlayed = player.gamesPlayed
      const initialWon = player.gamesWon

      player.recordGameWin()

      expect(player.gamesPlayed).toBe(initialPlayed + 1)
      expect(player.gamesWon).toBe(initialWon + 1)
    })

    it('should record game loss', () => {
      const initialPlayed = player.gamesPlayed
      const initialWon = player.gamesWon

      player.recordGameLoss()

      expect(player.gamesPlayed).toBe(initialPlayed + 1)
      expect(player.gamesWon).toBe(initialWon)
    })

    it('should calculate win rate correctly', () => {
      expect(player.winRate).toBe(0.6) // 6/10

      player.recordGameWin()
      expect(player.winRate).toBe(7 / 11)

      player.recordGameLoss()
      expect(player.winRate).toBe(7 / 12)
    })

    it('should return 0 win rate when no games played', () => {
      const newPlayer = PlayerFactory.create()
      expect(newPlayer.winRate).toBe(0)
    })
  })

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const player = PlayerFactory.create({
        nickName: 'TestPlayer',
        gamesPlayed: 10,
        gamesWon: 6,
      })

      const json = player.toJSON()

      expect(json).toEqual({
        uuid: player.uuid,
        userUuid: player.userUuid,
        nickName: 'TestPlayer',
        gamesPlayed: 10,
        gamesWon: 6,
        winRate: 0.6,
        createdAt: player.createdAt,
      })
    })

    it('should serialize to PlayerInterface correctly', () => {
      const player = PlayerFactory.create({
        nickName: 'TestPlayer',
      })

      const playerInterface = player.toPlayerInterface()

      expect(playerInterface).toEqual({
        uuid: player.uuid,
        nickName: 'TestPlayer',
      })
    })
  })
})
