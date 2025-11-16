import { ApplicationService } from '@adonisjs/core/types'
import { EventBusService } from '#shared_kernel/infrastructure/event_bus.service'
import { LucidUserRepository } from '#domains/iam/infrastructure/persistence/user_repository.lucid'
import { LobbyRepositoryInMemory } from '#domains/lobby/infrastructure/persistence/lobby_repository.in_memory'

/**
 * AppProvider - DDD Architecture
 *
 * Enregistre les services partagés dans le container IoC pour l'injection de dépendances
 *
 * IMPORTANT: Les lobbies utilisent un repository EN MÉMOIRE (LobbyRepositoryInMemory)
 * - Lobbies WAITING/READY = En RAM, perdus au redémarrage (c'est voulu!)
 * - Lobbies IN_GAME = Migrés vers DB via LobbyRepositoryLucid quand .start()
 */
export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  async register() {
    // Enregistrer EventBusService comme singleton
    this.app.container.singleton(EventBusService, () => {
      return new EventBusService()
    })

    // Enregistrer UserRepository comme singleton
    this.app.container.singleton(LucidUserRepository, () => {
      return new LucidUserRepository()
    })

    // Enregistrer LobbyRepository IN-MEMORY comme singleton
    // Les lobbies sont en RAM jusqu'au start(), puis migrés vers DB
    this.app.container.singleton(LobbyRepositoryInMemory, () => {
      return new LobbyRepositoryInMemory()
    })
  }
}

/**
 * Define static types for container bindings using TypeScript declaration merging
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    // Les bindings sont automatiquement inférés par le container
  }
}
