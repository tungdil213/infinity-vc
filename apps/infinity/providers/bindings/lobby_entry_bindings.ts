import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { defaultGameCatalog } from '#infrastructure/game_engine/launcher_game_catalog'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'

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
