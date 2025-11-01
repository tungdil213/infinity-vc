import { ApplicationService } from '@adonisjs/core/types'
import { InMemoryLobbyRepository } from '../infrastructure/repositories/in_memory_lobby_repository.js'
import { InMemoryPlayerRepository } from '../infrastructure/repositories/in_memory_player_repository.js'

/**
 * Provider pour enregistrer les repositories dans le container IoC
 */
export default class RepositoryProvider {
  constructor(protected app: ApplicationService) {}

  async register() {
    console.log('📦 RepositoryProvider: Registering repositories...')

    // Enregistrer les implémentations concrètes comme singletons
    this.app.container.singleton(InMemoryLobbyRepository, () => {
      return new InMemoryLobbyRepository()
    })

    this.app.container.singleton(InMemoryPlayerRepository, () => {
      return new InMemoryPlayerRepository()
    })

    console.log('✅ RepositoryProvider: Repositories registered')
  }

  async boot() {
    // Rien à faire au boot
  }
}
