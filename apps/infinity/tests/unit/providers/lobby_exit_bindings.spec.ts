import { test } from '@japa/runner'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import {
  registerLobbyExitBindings,
  type BindingRegistrar,
  type BindingResolver,
} from '../../../providers/bindings/lobby_exit_bindings.js'

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

test.group('lobby_exit_bindings', () => {
  test('registers the expected lobby exit binding and preserves its class token', ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()

    registerLobbyExitBindings(registrar)

    assert.deepEqual([...registrar.bindings.keys()], [LeaveLobbyUseCase])
  })

  test('resolves leave lobby binding with the same dependency graph', async ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()
    registerLobbyExitBindings(registrar)

    const hybridLobbyService = new HybridLobbyService(
      new InMemoryLobbyRepository(),
      new DatabaseLobbyRepository()
    )
    const notificationService = new TransmitLobbyService()
    const eventService = new LobbyEventService(hybridLobbyService)

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([
        [HybridLobbyService, hybridLobbyService],
        [TransmitLobbyService, notificationService],
        [LobbyEventService, eventService],
      ])
    )

    const leaveFactory = registrar.bindings.get(LeaveLobbyUseCase)

    assert.exists(leaveFactory)

    const leaveLobbyUseCase = await leaveFactory!(resolver)

    assert.instanceOf(leaveLobbyUseCase, LeaveLobbyUseCase)
  })
})
