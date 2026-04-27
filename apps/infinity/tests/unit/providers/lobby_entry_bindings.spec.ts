import { test } from '@japa/runner'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import {
  registerLobbyEntryBindings,
  type BindingRegistrar,
  type BindingResolver,
} from '../../../providers/bindings/lobby_entry_bindings.js'

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

test.group('lobby_entry_bindings', () => {
  test('registers the expected lobby entry bindings and preserves their class tokens', ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()

    registerLobbyEntryBindings(registrar)

    assert.deepEqual([...registrar.bindings.keys()], [CreateLobbyUseCase, JoinLobbyUseCase])
  })

  test('resolves lobby entry bindings with the same dependency graph', async ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()
    registerLobbyEntryBindings(registrar)

    const hybridLobbyService = new HybridLobbyService(
      new InMemoryLobbyRepository(),
      new DatabaseLobbyRepository()
    )
    const playerRepository = new DatabasePlayerRepository()
    const notificationService = new TransmitLobbyService()

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([
        [DatabasePlayerRepository, playerRepository],
        [HybridLobbyService, hybridLobbyService],
        [TransmitLobbyService, notificationService],
      ])
    )

    const createFactory = registrar.bindings.get(CreateLobbyUseCase)
    const joinFactory = registrar.bindings.get(JoinLobbyUseCase)

    assert.exists(createFactory)
    assert.exists(joinFactory)

    const createLobbyUseCase = await createFactory!(resolver)
    const joinLobbyUseCase = await joinFactory!(resolver)

    assert.instanceOf(createLobbyUseCase, CreateLobbyUseCase)
    assert.instanceOf(joinLobbyUseCase, JoinLobbyUseCase)
  })
})
