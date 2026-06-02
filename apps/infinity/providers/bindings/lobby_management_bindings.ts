import { EventBusDomainEventPublisher } from '#application/services/domain_event_publisher'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { CloseLobbyUseCase } from '#application/use_cases/close_lobby_use_case'
import { KickPlayerUseCase } from '#application/use_cases/kick_player_use_case'
import { SetPlayerReadyUseCase } from '#application/use_cases/set_player_ready_use_case'
import { ShowLobbyUseCase } from '#application/use_cases/show_lobby_use_case'
import { TransferOwnershipUseCase } from '#application/use_cases/transfer_ownership_use_case'
import { UpdateLobbySettingsUseCase } from '#application/use_cases/update_lobby_settings_use_case'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerLobbyManagementBindings(registrar: BindingRegistrar): void {
  registrar.singleton(ShowLobbyUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    return new ShowLobbyUseCase(hybridLobbyService)
  })

  registrar.singleton(KickPlayerUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const playerRepository = await resolver.make(DatabasePlayerRepository)
    const domainEventPublisher = await resolver.make(EventBusDomainEventPublisher)
    return new KickPlayerUseCase(hybridLobbyService, playerRepository, domainEventPublisher)
  })

  registrar.singleton(CloseLobbyUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const eventService = await resolver.make(LobbyEventService)
    return new CloseLobbyUseCase(hybridLobbyService, eventService)
  })

  registrar.singleton(TransferOwnershipUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const domainEventPublisher = await resolver.make(EventBusDomainEventPublisher)
    return new TransferOwnershipUseCase(hybridLobbyService, domainEventPublisher)
  })

  registrar.singleton(UpdateLobbySettingsUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const domainEventPublisher = await resolver.make(EventBusDomainEventPublisher)
    return new UpdateLobbySettingsUseCase(hybridLobbyService, domainEventPublisher)
  })

  registrar.singleton(SetPlayerReadyUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const playerRepository = await resolver.make(DatabasePlayerRepository)
    const domainEventPublisher = await resolver.make(EventBusDomainEventPublisher)
    return new SetPlayerReadyUseCase(hybridLobbyService, playerRepository, domainEventPublisher)
  })
}
