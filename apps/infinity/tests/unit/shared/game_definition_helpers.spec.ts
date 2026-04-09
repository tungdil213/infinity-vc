import { test } from '@japa/runner'
import type { GameDefinition, GameSettingsDefinition } from '@infinity.dev/game-engine'
import {
  buildDefaultGameSettings,
  coerceGameSettings,
  toAvailableGameSettingViewModel,
  toAvailableGameViewModel,
} from '../../../app/utils/game_definition_helpers.js'

const settingsDefinition: GameSettingsDefinition<Record<string, unknown>> = {
  fields: [
    {
      key: 'roundsToWin',
      label: 'Rounds to win',
      type: 'number',
      required: true,
      defaultValue: 3,
      min: 1,
      max: 10,
    },
    {
      key: 'allowDrawReplay',
      label: 'Replay draw rounds',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'theme',
      label: 'Theme',
      type: 'select',
      defaultValue: 'classic',
      options: [
        { value: 'classic', label: 'Classic' },
        { value: 'arcade', label: 'Arcade' },
      ],
    },
  ],
  validate: () => [],
}

function makeDefinition(): GameDefinition<Record<string, unknown>> {
  return {
    id: 'test-game',
    displayName: 'Test Game',
    description: 'Game used for config helper tests',
    metadata: {
      gameType: 'test-game',
      version: '1.0.0',
      description: 'metadata',
      minPlayers: 2,
      maxPlayers: 4,
      estimatedDuration: '10m',
      complexity: 'simple',
    },
    playerConstraints: {
      minPlayers: 2,
      maxPlayers: 4,
    },
    settings: settingsDefinition,
    capabilities: ['turn-based'],
    actionDescriptors: [],
  }
}

test.group('game_definition_helpers', () => {
  test('toAvailableGameViewModel should expose schema-driven lobby metadata', ({ assert }) => {
    const viewModel = toAvailableGameViewModel(makeDefinition())

    assert.equal(viewModel.id, 'test-game')
    assert.equal(viewModel.minPlayers, 2)
    assert.equal(viewModel.maxPlayers, 4)
    assert.equal(viewModel.settings.length, 3)
    assert.equal(viewModel.settings[0].key, 'roundsToWin')
    assert.equal(viewModel.settings[2].options?.[1]?.value, 'arcade')
  })

  test('buildDefaultGameSettings should use field defaults', ({ assert }) => {
    const defaults = buildDefaultGameSettings(
      settingsDefinition.fields.map(toAvailableGameSettingViewModel)
    )

    assert.deepEqual(defaults, {
      roundsToWin: 3,
      allowDrawReplay: true,
      theme: 'classic',
    })
  })

  test('coerceGameSettings should coerce common HTML form payloads and ignore unknown keys', ({
    assert,
  }) => {
    const coerced = coerceGameSettings(
      settingsDefinition.fields.map(toAvailableGameSettingViewModel),
      {
        roundsToWin: '5',
        allowDrawReplay: 'false',
        theme: 'arcade',
        ignored: 'value',
      }
    )

    assert.deepEqual(coerced, {
      roundsToWin: 5,
      allowDrawReplay: false,
      theme: 'arcade',
    })
  })
})
