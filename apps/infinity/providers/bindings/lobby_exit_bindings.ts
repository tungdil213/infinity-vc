import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'

type ContainerBinding<T> = abstract new (...args: never[]) => T

export interface BindingResolver {
  make<T>(binding: ContainerBinding<T>): Promise<T>
}

export interface BindingRegistrar {
  singleton<T>(
    binding: ContainerBinding<T>,
    factory: (resolver: BindingResolver) => T | Promise<T>
  ): void
}

export function registerLobbyExitBindings(registrar: BindingRegistrar): void {
  registrar.singleton(LeaveLobbyUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const notificationService = await resolver.make(TransmitLobbyService)
    const eventService = await resolver.make(LobbyEventService)
    return new LeaveLobbyUseCase(hybridLobbyService, notificationService, eventService)
  })
}
