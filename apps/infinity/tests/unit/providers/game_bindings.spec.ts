import { test } from '@japa/runner'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { ListGameCatalogUseCase } from '#application/use_cases/list_game_catalog_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { registerGameBindings } from '../../../providers/bindings/game_bindings.js'
import {
  MapBindingResolver,
  RecordingBindingRegistrar,
  type ContainerBinding,
} from './support/binding_test_helpers.js'

test.group('game_bindings', () => {
  test('registers game use cases and preserves their class tokens', ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()

    registerGameBindings(registrar)

    assert.deepEqual([...registrar.bindings.keys()], [StartGameUseCase, ListGameCatalogUseCase])
  })

  test('resolves game bindings without casting the game repository adapter', async ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()
    registerGameBindings(registrar)

    const hybridLobbyService = new HybridLobbyService(
      new InMemoryLobbyRepository(),
      new DatabaseLobbyRepository()
    )
    const gameRepository = new DatabaseGameRepository()
    const notificationService = new TransmitLobbyService()

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([
        [HybridLobbyService, hybridLobbyService],
        [DatabaseGameRepository, gameRepository],
        [TransmitLobbyService, notificationService],
      ])
    )

    const startFactory = registrar.bindings.get(StartGameUseCase)
    const catalogFactory = registrar.bindings.get(ListGameCatalogUseCase)

    assert.exists(startFactory)
    assert.exists(catalogFactory)

    const startGameUseCase = await startFactory!(resolver)
    const listGameCatalogUseCase = await catalogFactory!(resolver)

    assert.instanceOf(startGameUseCase, StartGameUseCase)
    assert.instanceOf(listGameCatalogUseCase, ListGameCatalogUseCase)
  })
})
