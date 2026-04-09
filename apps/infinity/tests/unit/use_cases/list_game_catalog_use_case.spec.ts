import { test } from '@japa/runner'
import type {
  GameCapability,
  GameDefinition,
  GameSettingsDefinition,
} from '@infinity.dev/game-engine'
import {
  ListGameCatalogUseCase,
} from '../../../app/application/use_cases/list_game_catalog_use_case.js'

const emptySettings: GameSettingsDefinition<Record<string, unknown>> = {
  fields: [],
  validate: () => [],
}

function makeGameDefinition(
  id: string,
  distribution: 'open-source' | 'proprietary',
  capabilities: readonly GameCapability[]
): GameDefinition<Record<string, unknown>> {
  return {
    id,
    displayName: id,
    description: `${id} description`,
    metadata: {
      gameType: id,
      version: '1.0.0',
      description: `${id} metadata`,
      minPlayers: 2,
      maxPlayers: 4,
      estimatedDuration: '15m',
      complexity: 'simple',
    },
    playerConstraints: {
      minPlayers: 2,
      maxPlayers: 4,
    },
    settings: emptySettings,
    capabilities,
    licensing: {
      distribution,
    },
    actionDescriptors: [],
  }
}

test.group('ListGameCatalogUseCase', () => {
  test('should return mapped game catalog items', ({ assert }) => {
    let capturedQuery: {
      includeProprietary?: boolean
      requiredCapabilities?: readonly GameCapability[]
    } | null = null

    const useCase = new ListGameCatalogUseCase({
      findGameDefinition: () => null,
      listGames: (query) => {
        capturedQuery = query || null
        return [makeGameDefinition('rock-paper-scissors', 'open-source', ['turn-based'])]
      },
    })

    const result = useCase.execute({
      includeProprietary: false,
      requiredCapabilities: ['turn-based'],
    })

    assert.isTrue(result.isSuccess)
    assert.deepEqual(capturedQuery, {
      includeProprietary: false,
      requiredCapabilities: ['turn-based'],
    })
    assert.equal(result.value.games.length, 1)
    assert.equal(result.value.games[0].distribution, 'open-source')
    assert.deepEqual(result.value.games[0].capabilities, ['turn-based'])
  })

  test('should support proprietary catalog responses', ({ assert }) => {
    const useCase = new ListGameCatalogUseCase({
      findGameDefinition: () => null,
      listGames: () => [
        makeGameDefinition('secret-game', 'proprietary', ['turn-based', 'hidden-information']),
      ],
    })

    const result = useCase.execute({
      includeProprietary: true,
    })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.games.length, 1)
    assert.equal(result.value.games[0].distribution, 'proprietary')
  })
})
