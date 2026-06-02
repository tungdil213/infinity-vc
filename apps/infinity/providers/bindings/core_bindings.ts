import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerCoreBindings(registrar: BindingRegistrar): void {
  registrar.singleton(DatabaseUserRepository, () => {
    return new DatabaseUserRepository()
  })

  registrar.singleton(DatabasePlayerRepository, () => {
    return new DatabasePlayerRepository()
  })

  registrar.singleton(DatabaseLobbyRepository, () => {
    return new DatabaseLobbyRepository()
  })

  registrar.singleton(InMemoryLobbyRepository, () => {
    return new InMemoryLobbyRepository()
  })

  registrar.singleton(HybridLobbyService, async (resolver) => {
    const inMemoryRepository = await resolver.make(InMemoryLobbyRepository)
    const databaseRepository = await resolver.make(DatabaseLobbyRepository)
    return new HybridLobbyService(inMemoryRepository, databaseRepository)
  })

  registrar.singleton(DatabaseGameRepository, () => {
    return new DatabaseGameRepository()
  })

  registrar.singleton(DatabaseInvitationRepository, () => {
    return new DatabaseInvitationRepository()
  })
}
