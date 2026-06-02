import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerLobbyExitBindings(registrar: BindingRegistrar): void {
  registrar.singleton(LeaveLobbyUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const notificationService = await resolver.make(TransmitLobbyService)
    const eventService = await resolver.make(LobbyEventService)
    return new LeaveLobbyUseCase(hybridLobbyService, notificationService, eventService)
  })
}
