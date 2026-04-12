import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'

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

export function registerLobbyListingBindings(registrar: BindingRegistrar): void {
  registrar.singleton(ListLobbiesUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    return new ListLobbiesUseCase(hybridLobbyService)
  })
}
