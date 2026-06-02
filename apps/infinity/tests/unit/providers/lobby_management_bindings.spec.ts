import { test } from '@japa/runner'
import { EventBusDomainEventPublisher } from '#application/services/domain_event_publisher'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { CloseLobbyUseCase } from '#application/use_cases/close_lobby_use_case'
import { KickPlayerUseCase } from '#application/use_cases/kick_player_use_case'
import { SetPlayerReadyUseCase } from '#application/use_cases/set_player_ready_use_case'
import { ShowLobbyUseCase } from '#application/use_cases/show_lobby_use_case'
import { TransferOwnershipUseCase } from '#application/use_cases/transfer_ownership_use_case'
import { UpdateLobbySettingsUseCase } from '#application/use_cases/update_lobby_settings_use_case'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import {
  registerLobbyManagementBindings,
  type BindingRegistrar,
  type BindingResolver,
} from '../../../providers/bindings/lobby_management_bindings.js'

type ContainerBinding<T> = abstract new (...args: never[]) => T

type BindingFactory<T> = (resolver: BindingResolver) => T | Promise<T>

class RecordingBindingRegistrar implements BindingRegistrar {
  readonly bindings = new Map<ContainerBinding<unknown>, BindingFactory<unknown>>()

  singleton<T>(binding: ContainerBinding<T>, factory: BindingFactory<T>): void {
    this.bindings.set(binding, factory as BindingFactory<unknown>)
  }
}

class MapBindingResolver implements BindingResolver {
  constructor(private readonly values: Map<ContainerBinding<unknown>, unknown>) {}

  async make<T>(binding: ContainerBinding<T>): Promise<T> {
    const value = this.values.get(binding)
    if (value === undefined) {
      throw new Error(`Missing binding for ${binding.name}`)
    }

    return value as T
  }
}

test.group('lobby_management_bindings', () => {
  test('registers the expected lobby management bindings and preserves their class tokens', ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()

    registerLobbyManagementBindings(registrar)

    assert.deepEqual(
      [...registrar.bindings.keys()],
      [
        ShowLobbyUseCase,
        KickPlayerUseCase,
        CloseLobbyUseCase,
        TransferOwnershipUseCase,
        UpdateLobbySettingsUseCase,
        SetPlayerReadyUseCase,
      ]
    )
  })

  test('resolves representative lobby management bindings with the same dependency graph', async ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()
    registerLobbyManagementBindings(registrar)

    const hybridLobbyService = new HybridLobbyService(
      new InMemoryLobbyRepository(),
      new DatabaseLobbyRepository()
    )
    const playerRepository = new DatabasePlayerRepository()
    const domainEventPublisher = new EventBusDomainEventPublisher()
    const lobbyEventService = new LobbyEventService(hybridLobbyService)

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([
        [HybridLobbyService, hybridLobbyService],
        [DatabasePlayerRepository, playerRepository],
        [EventBusDomainEventPublisher, domainEventPublisher],
        [LobbyEventService, lobbyEventService],
      ])
    )

    const showFactory = registrar.bindings.get(ShowLobbyUseCase)
    const closeFactory = registrar.bindings.get(CloseLobbyUseCase)
    const transferFactory = registrar.bindings.get(TransferOwnershipUseCase)
    const setReadyFactory = registrar.bindings.get(SetPlayerReadyUseCase)

    assert.exists(showFactory)
    assert.exists(closeFactory)
    assert.exists(transferFactory)
    assert.exists(setReadyFactory)

    const showLobbyUseCase = await showFactory!(resolver)
    const closeLobbyUseCase = await closeFactory!(resolver)
    const transferOwnershipUseCase = await transferFactory!(resolver)
    const setPlayerReadyUseCase = await setReadyFactory!(resolver)

    assert.instanceOf(showLobbyUseCase, ShowLobbyUseCase)
    assert.instanceOf(closeLobbyUseCase, CloseLobbyUseCase)
    assert.instanceOf(transferOwnershipUseCase, TransferOwnershipUseCase)
    assert.instanceOf(setPlayerReadyUseCase, SetPlayerReadyUseCase)
  })
})
