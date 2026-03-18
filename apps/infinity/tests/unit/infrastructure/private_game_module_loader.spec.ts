import { test } from '@japa/runner'
import { createGameLauncher, rockPaperScissorsModule } from '@infinity.dev/game-engine'
import { PrivateGameModuleLoader } from '../../../app/infrastructure/game_engine/private_game_module_loader.js'

test.group('PrivateGameModuleLoader', () => {
  test('loads and registers modules from importer namespace', async ({ assert }) => {
    const loader = new PrivateGameModuleLoader(['@infinity.private/rps'], async () => ({
      gameModule: rockPaperScissorsModule,
    }))
    const launcher = createGameLauncher([])

    const report = await loader.loadInto(launcher)

    assert.deepEqual(report.failedSpecifiers, [])
    assert.include(report.loadedModuleIds, 'rock-paper-scissors')
    assert.isNotNull(launcher.getGameDefinition('rock-paper-scissors'))
  })

  test('rejects unsafe module specifiers', async ({ assert }) => {
    const loader = new PrivateGameModuleLoader(['../evil-module'], async () => ({
      gameModule: rockPaperScissorsModule,
    }))
    const launcher = createGameLauncher([])

    const report = await loader.loadInto(launcher)

    assert.equal(report.loadedModuleIds.length, 0)
    assert.equal(report.failedSpecifiers.length, 1)
    assert.equal(report.failedSpecifiers[0].specifier, '../evil-module')
    assert.include(report.failedSpecifiers[0].reason, 'Unsafe')
  })

  test('reports missing module exports', async ({ assert }) => {
    const loader = new PrivateGameModuleLoader(['@infinity.private/invalid'], async () => ({
      notAGameModule: true,
    }))
    const launcher = createGameLauncher([])

    const report = await loader.loadInto(launcher)

    assert.equal(report.loadedModuleIds.length, 0)
    assert.equal(report.failedSpecifiers.length, 1)
    assert.equal(report.failedSpecifiers[0].specifier, '@infinity.private/invalid')
    assert.include(report.failedSpecifiers[0].reason, 'No GameModule export found')
  })
})
