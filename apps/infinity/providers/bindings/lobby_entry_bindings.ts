import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { defaultGameCatalog } from '#infrastructure/game_engine/launcher_game_catalog'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerLobbyEntryBindings(registrar: BindingRegistrar): void {
  registrar.singleton(CreateLobbyUseCase, async (resolver) => {
    const playerRepository = await resolver.make(DatabasePlayerRepository)
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const notificationService = await resolver.make(TransmitLobbyService)
    return new CreateLobbyUseCase(
      playerRepository,
      hybridLobbyService,
      notificationService,
      defaultGameCatalog
    )
  })

  registrar.singleton(JoinLobbyUseCase, async (resolver) => {
    const playerRepository = await resolver.make(DatabasePlayerRepository)
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const notificationService = await resolver.make(TransmitLobbyService)
    return new JoinLobbyUseCase(playerRepository, hybridLobbyService, notificationService)
  })
}
