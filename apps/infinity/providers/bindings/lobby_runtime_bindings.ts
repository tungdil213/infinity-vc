import { EventBusDomainEventPublisher } from '#application/services/domain_event_publisher'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { LobbyPresenceService } from '#application/services/lobby_presence_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerLobbyRuntimeBindings(registrar: BindingRegistrar): void {
  registrar.singleton(EventBusDomainEventPublisher, () => {
    return new EventBusDomainEventPublisher()
  })

  registrar.singleton(TransmitLobbyService, () => {
    return new TransmitLobbyService()
  })

  registrar.singleton(LobbyEventService, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    return new LobbyEventService(hybridLobbyService)
  })

  registrar.singleton(LobbyPresenceService, () => {
    return new LobbyPresenceService()
  })
}
