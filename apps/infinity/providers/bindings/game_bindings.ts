import type { GameRepository } from '#application/repositories/game_repository'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { ListGameCatalogUseCase } from '#application/use_cases/list_game_catalog_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerGameBindings(registrar: BindingRegistrar): void {
  registrar.singleton(StartGameUseCase, async (resolver) => {
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    const gameRepository: GameRepository = await resolver.make(DatabaseGameRepository)
    const notificationService = await resolver.make(TransmitLobbyService)
    return new StartGameUseCase(hybridLobbyService, gameRepository, notificationService)
  })

  registrar.singleton(ListGameCatalogUseCase, () => {
    return new ListGameCatalogUseCase()
  })
}
