import { ApplicationService } from '@adonisjs/core/types'
import { InMemoryLobbyRepository } from '../infrastructure/repositories/in_memory_lobby_repository.js'
import { InMemoryPlayerRepository } from '../infrastructure/repositories/in_memory_player_repository.js'
import { HybridPlayerRepository } from '../infrastructure/repositories/hybrid_player_repository.js'

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

    // ✅ Utiliser HybridPlayerRepository qui cherche en mémoire puis en BD
    // On force le cast car HybridPlayerRepository implémente la même interface
    this.app.container.singleton(InMemoryPlayerRepository, () => {
      return new HybridPlayerRepository() as any
    })

    console.log('✅ RepositoryProvider: Repositories registered (Hybrid mode)')
  }

  async boot() {
    // Rien à faire au boot
  }
}
