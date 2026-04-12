import { test } from '@japa/runner'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import {
  registerLobbyListingBindings,
  type BindingRegistrar,
  type BindingResolver,
} from '../../../providers/bindings/lobby_listing_bindings.js'

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

test.group('lobby_listing_bindings', () => {
  test('registers the expected lobby listing binding and preserves its class token', ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()

    registerLobbyListingBindings(registrar)

    assert.deepEqual([...registrar.bindings.keys()], [ListLobbiesUseCase])
  })

  test('resolves list lobbies binding with the same dependency graph', async ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()
    registerLobbyListingBindings(registrar)

    const hybridLobbyService = new HybridLobbyService(
      new InMemoryLobbyRepository(),
      new DatabaseLobbyRepository()
    )

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([[HybridLobbyService, hybridLobbyService]])
    )

    const listFactory = registrar.bindings.get(ListLobbiesUseCase)

    assert.exists(listFactory)

    const listLobbiesUseCase = await listFactory!(resolver)

    assert.instanceOf(listLobbiesUseCase, ListLobbiesUseCase)
  })
})
