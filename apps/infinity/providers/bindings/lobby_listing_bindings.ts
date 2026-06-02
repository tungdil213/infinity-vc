import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerLobbyListingBindings(registrar: BindingRegistrar): void {
  registrar.singleton(ListLobbiesUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    return new ListLobbiesUseCase(hybridLobbyService)
  })
}
