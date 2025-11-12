import { ApplicationService } from '@adonisjs/core/types'
import { EventBusService } from '#shared_kernel/infrastructure/event_bus.service'
import { LucidUserRepository } from '#domains/iam/infrastructure/persistence/user_repository.lucid'
import { LobbyRepositoryLucid } from '#domains/lobby/infrastructure/persistence/lobby_repository.lucid'

/**
 * AppProvider - DDD Architecture
 *
 * Enregistre les services partagés dans le container IoC pour l'injection de dépendances
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

    // Enregistrer LobbyRepository comme singleton
    this.app.container.singleton(LobbyRepositoryLucid, () => {
      return new LobbyRepositoryLucid()
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
