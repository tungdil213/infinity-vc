import { test } from '@japa/runner'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { registerCoreBindings } from '../../../providers/bindings/core_bindings.js'
import {
  MapBindingResolver,
  RecordingBindingRegistrar,
  type ContainerBinding,
} from './support/binding_test_helpers.js'

test.group('core_bindings', () => {
  test('registers core repositories and hybrid lobby service in dependency order', ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()

    registerCoreBindings(registrar)

    assert.deepEqual(
      [...registrar.bindings.keys()],
      [
        DatabaseUserRepository,
        DatabasePlayerRepository,
        DatabaseLobbyRepository,
        InMemoryLobbyRepository,
        HybridLobbyService,
        DatabaseGameRepository,
        DatabaseInvitationRepository,
      ]
    )
  })

  test('resolves hybrid lobby service from registered repository adapters', async ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()
    registerCoreBindings(registrar)

    const databaseLobbyFactory = registrar.bindings.get(DatabaseLobbyRepository)
    const inMemoryLobbyFactory = registrar.bindings.get(InMemoryLobbyRepository)
    const hybridLobbyFactory = registrar.bindings.get(HybridLobbyService)

    assert.exists(databaseLobbyFactory)
    assert.exists(inMemoryLobbyFactory)
    assert.exists(hybridLobbyFactory)

    const emptyResolver = new MapBindingResolver(new Map())
    const databaseLobbyRepository = await databaseLobbyFactory!(emptyResolver)
    const inMemoryLobbyRepository = await inMemoryLobbyFactory!(emptyResolver)

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([
        [DatabaseLobbyRepository, databaseLobbyRepository],
        [InMemoryLobbyRepository, inMemoryLobbyRepository],
      ])
    )

    const hybridLobbyService = await hybridLobbyFactory!(resolver)

    assert.instanceOf(databaseLobbyRepository, DatabaseLobbyRepository)
    assert.instanceOf(inMemoryLobbyRepository, InMemoryLobbyRepository)
    assert.instanceOf(hybridLobbyService, HybridLobbyService)
  })
})
