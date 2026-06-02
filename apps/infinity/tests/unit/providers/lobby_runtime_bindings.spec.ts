import { test } from '@japa/runner'
import { EventBusDomainEventPublisher } from '#application/services/domain_event_publisher'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { LobbyPresenceService } from '#application/services/lobby_presence_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { registerLobbyRuntimeBindings } from '../../../providers/bindings/lobby_runtime_bindings.js'
import {
  MapBindingResolver,
  RecordingBindingRegistrar,
  type ContainerBinding,
} from './support/binding_test_helpers.js'

test.group('lobby_runtime_bindings', () => {
  test('registers lobby runtime services and publisher bindings', ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()

    registerLobbyRuntimeBindings(registrar)

    assert.deepEqual(
      [...registrar.bindings.keys()],
      [
        EventBusDomainEventPublisher,
        TransmitLobbyService,
        LobbyEventService,
        LobbyPresenceService,
      ]
    )
  })

  test('resolves representative lobby runtime bindings with the same dependency graph', async ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()
    registerLobbyRuntimeBindings(registrar)

    const hybridLobbyService = new HybridLobbyService(
      new InMemoryLobbyRepository(),
      new DatabaseLobbyRepository()
    )

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([[HybridLobbyService, hybridLobbyService]])
    )

    const publisherFactory = registrar.bindings.get(EventBusDomainEventPublisher)
    const lobbyEventFactory = registrar.bindings.get(LobbyEventService)
    const presenceFactory = registrar.bindings.get(LobbyPresenceService)

    assert.exists(publisherFactory)
    assert.exists(lobbyEventFactory)
    assert.exists(presenceFactory)

    const publisher = await publisherFactory!(resolver)
    const lobbyEventService = await lobbyEventFactory!(resolver)
    const lobbyPresenceService = await presenceFactory!(resolver)

    assert.instanceOf(publisher, EventBusDomainEventPublisher)
    assert.instanceOf(lobbyEventService, LobbyEventService)
    assert.instanceOf(lobbyPresenceService, LobbyPresenceService)
  })
})
