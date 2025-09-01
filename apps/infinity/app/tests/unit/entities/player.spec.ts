import { test } from '@japa/runner'
import Player from '../../../domain/entities/player.js'
import { PlayerFactory } from '../../factories/player_factory.js'

test.group('Player Entity', () => {
  test.group('creation', () => {
    test('should create a player with valid data', ({ assert }) => {
      const playerData = {
        userUuid: crypto.randomUUID(),
        nickName: 'TestPlayer',
      }

      const player = Player.create(playerData)

      assert.equal(player.userUuid, playerData.userUuid)
      assert.equal(player.nickName, 'TestPlayer')
      assert.equal(player.gamesPlayed, 0)
      assert.equal(player.gamesWon, 0)
      assert.equal(player.winRate, 0)
      assert.exists(player.uuid)
      assert.instanceOf(player.createdAt, Date)
    })

    test('should generate a UUID when not provided', ({ assert }) => {
      const player = PlayerFactory.create()
      assert.exists(player.uuid)
      assert.equal(typeof player.uuid, 'string')
    })

    test('should trim whitespace from nickName', ({ assert }) => {
      const player = Player.create({
        userUuid: crypto.randomUUID(),
        nickName: '  TestPlayer  ',
      })

      assert.equal(player.nickName, 'TestPlayer')
    })

    test('should initialize with provided stats', ({ assert }) => {
      const player = Player.create({
        userUuid: crypto.randomUUID(),
        nickName: 'TestPlayer',
        gamesPlayed: 10,
        gamesWon: 7,
      })

      assert.equal(player.gamesPlayed, 10)
      assert.equal(player.gamesWon, 7)
      assert.equal(player.winRate, 0.7)
    })
  })

  test.group('validation', () => {
    test('should throw error for invalid userUuid', ({ assert }) => {
      assert.throws(() => {
        Player.create({
          userUuid: 'invalid-uuid',
          nickName: 'TestPlayer',
        })
      }, 'Invalid user UUID format')
    })

    test('should throw error for short nickName', ({ assert }) => {
      assert.throws(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'ab',
        })
      }, 'Nickname must be between 3 and 30 characters')
    })

    test('should throw error for long nickName', ({ assert }) => {
      assert.throws(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'a'.repeat(31),
        })
      }, 'Nickname must be between 3 and 30 characters')
    })

    test('should throw error for nickName with invalid characters', ({ assert }) => {
      assert.throws(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'Test@Player',
        })
      }, 'Nickname can only contain letters, numbers, spaces, underscores and hyphens')
    })

    test('should throw error for negative gamesPlayed', ({ assert }) => {
      assert.throws(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'TestPlayer',
          gamesPlayed: -1,
        })
      }, 'Games played cannot be negative')
    })

    test('should throw error for negative gamesWon', ({ assert }) => {
      assert.throws(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'TestPlayer',
          gamesWon: -1,
        })
      }, 'Games won cannot be negative')
    })

    test('should throw error when gamesWon exceeds gamesPlayed', ({ assert }) => {
      assert.throws(() => {
        Player.create({
          userUuid: crypto.randomUUID(),
          nickName: 'TestPlayer',
          gamesPlayed: 5,
          gamesWon: 7,
        })
      }, 'Games won cannot exceed games played')
    })
  })

  test.group('methods', () => {
    let player: Player

    test('should update nickname', ({ assert }) => {
      player = PlayerFactory.create({
        gamesPlayed: 10,
        gamesWon: 6,
      })

      player.updateNickName('NewNickName')

      assert.equal(player.nickName, 'NewNickName')
    })

    test('should throw error when updating to invalid nickname', ({ assert }) => {
      player = PlayerFactory.create({
        gamesPlayed: 10,
        gamesWon: 6,
      })

      assert.throws(() => {
        player.updateNickName('ab')
      }, 'Nickname must be between 3 and 30 characters')
    })

    test('should record game win', ({ assert }) => {
      player = PlayerFactory.create({
        gamesPlayed: 10,
        gamesWon: 6,
      })

      const initialPlayed = player.gamesPlayed
      const initialWon = player.gamesWon

      player.recordGameWin()

      assert.equal(player.gamesPlayed, initialPlayed + 1)
      assert.equal(player.gamesWon, initialWon + 1)
    })

    test('should record game loss', ({ assert }) => {
      player = PlayerFactory.create({
        gamesPlayed: 10,
        gamesWon: 6,
      })

      const initialPlayed = player.gamesPlayed
      const initialWon = player.gamesWon

      player.recordGameLoss()

      assert.equal(player.gamesPlayed, initialPlayed + 1)
      assert.equal(player.gamesWon, initialWon)
    })

    test('should calculate win rate correctly', ({ assert }) => {
      player = PlayerFactory.create({
        gamesPlayed: 10,
        gamesWon: 6,
      })

      assert.equal(player.winRate, 0.6) // 6/10

      player.recordGameWin()
      assert.equal(player.winRate, 7 / 11)

      player.recordGameLoss()
      assert.equal(player.winRate, 7 / 12)
    })

    test('should return 0 win rate when no games played', ({ assert }) => {
      const newPlayer = PlayerFactory.create()
      assert.equal(newPlayer.winRate, 0)
    })
  })

  test.group('serialization', () => {
    test('should serialize to JSON correctly', ({ assert }) => {
      const player = PlayerFactory.create({
        nickName: 'TestPlayer',
        gamesPlayed: 10,
        gamesWon: 6,
      })

      const json = player.toJSON()

      assert.deepEqual(json, {
        uuid: player.uuid,
        userUuid: player.userUuid,
        nickName: 'TestPlayer',
        gamesPlayed: 10,
        gamesWon: 6,
        winRate: 0.6,
        createdAt: player.createdAt,
      })
    })

    test('should serialize to PlayerInterface correctly', ({ assert }) => {
      const player = PlayerFactory.create({
        nickName: 'TestPlayer',
      })

      const playerInterface = player.toPlayerInterface()

      assert.deepEqual(playerInterface, {
        uuid: player.uuid,
        nickName: 'TestPlayer',
      })
    })
  })
})
