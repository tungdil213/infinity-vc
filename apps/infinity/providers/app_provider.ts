import { ApplicationService } from '@adonisjs/core/types'

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

  async register() {}
}

/**
 * Type helper pour accéder au provider depuis l'app
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {}
}
