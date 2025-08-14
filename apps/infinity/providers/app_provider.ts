import { ApplicationService } from '@adonisjs/core/types'
import { DatabaseUserRepository } from '../app/infrastructure/repositories/database_user_repository.js'
import { DatabasePlayerRepository } from '../app/infrastructure/repositories/database_player_repository.js'
import { UserRepository } from '../app/application/repositories/user_repository.js'
import { PlayerRepository } from '../app/application/repositories/player_repository.js'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  private registerRepository<
    T extends abstract new (...args: any[]) => any,
    V extends new (...args: any[]) => InstanceType<T>,
  >(repositoryInterface: T, defaultImplementation: V) {
    this.app.container.singleton(repositoryInterface, async () => {
      return new defaultImplementation()
    })
  }

  async register() {
    this.registerRepository(UserRepository, DatabaseUserRepository)
    this.registerRepository(PlayerRepository, DatabasePlayerRepository)
  }
}

/**
 * Type helper pour accéder au provider depuis l'app
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {}
}
