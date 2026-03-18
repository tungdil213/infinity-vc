import { test } from '@japa/runner'
import { GameActionUseCase } from '../../../app/application/use_cases/game_action_use_case.js'

test.group('GameActionUseCase', () => {
  const playerUuid = '11111111-1111-4111-8111-111111111111'

  test('should fail when game is not found', async ({ assert }) => {
    const useCase = new GameActionUseCase(
      {
        findByUuid: async () => null,
        save: async () => {},
      } as any,
      {
        findByUuid: async () => ({ uuid: playerUuid, fullName: 'Player One' }),
      } as any,
      {
        publishEvents: async () => {},
      } as any
    )

    const result = await useCase.execute({
      gameUuid: 'missing',
      playerUuid,
      action: 'end_turn',
    })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Game not found')
  })

  test('should fail for unknown action', async ({ assert }) => {
    const mockGame = {
      uuid: 'game-1',
      canPlayerPlay: () => true,
      toJSON: () => ({ uuid: 'game-1' }),
    }

    const useCase = new GameActionUseCase(
      {
        findByUuid: async () => mockGame,
        save: async () => {},
      } as any,
      {
        findByUuid: async () => ({ uuid: playerUuid, fullName: 'Player One' }),
      } as any,
      {
        publishEvents: async () => {},
      } as any
    )

    const result = await useCase.execute({
      gameUuid: 'game-1',
      playerUuid,
      action: 'unsupported_action',
    })

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Unknown action')
  })
})
