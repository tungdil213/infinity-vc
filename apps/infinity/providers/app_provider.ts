import { ApplicationService } from '@adonisjs/core/types'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { InMemoryPlayerRepository } from '#infrastructure/repositories/in_memory_player_repository'
import { HybridPlayerRepository } from '#infrastructure/repositories/hybrid_player_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import AuthenticateUserUseCase from '#application/use_cases/authenticate_user_use_case'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'
import { ShowLobbyUseCase } from '#application/use_cases/show_lobby_use_case'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  async register() {
    // Register repositories as singletons using class constructors (recommended approach)
    this.app.container.singleton(DatabaseUserRepository, () => {
      return new DatabaseUserRepository()
    })

    this.app.container.singleton(DatabasePlayerRepository, () => {
      return new DatabasePlayerRepository()
    })

    // ✅ Utiliser HybridPlayerRepository qui cherche en mémoire puis en BD
    this.app.container.singleton(InMemoryPlayerRepository, () => {
      return new HybridPlayerRepository() as any
    })

    this.app.container.singleton(DatabaseLobbyRepository, () => {
      return new DatabaseLobbyRepository()
    })

    this.app.container.singleton(InMemoryLobbyRepository, () => {
      return new InMemoryLobbyRepository()
    })

    this.app.container.singleton(HybridLobbyService, async (resolver) => {
      const inMemoryRepository = await resolver.make(InMemoryLobbyRepository)
      const databaseRepository = await resolver.make(DatabaseLobbyRepository)
      return new HybridLobbyService(inMemoryRepository, databaseRepository)
    })

    this.app.container.singleton(DatabaseGameRepository, () => {
      return new DatabaseGameRepository()
    })

    // Register services as singletons

    // Register Transmit-based lobby service
    this.app.container.singleton(TransmitLobbyService, () => {
      return new TransmitLobbyService()
    })

    // Register use cases as singletons with dependency injection
    this.app.container.singleton(RegisterUserUseCase, async (resolver) => {
      const userRepository = await resolver.make(DatabaseUserRepository)
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      return new RegisterUserUseCase(userRepository, playerRepository)
    })

    this.app.container.singleton(AuthenticateUserUseCase, async (resolver) => {
      const userRepository = await resolver.make(DatabaseUserRepository)
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      return new AuthenticateUserUseCase(userRepository, playerRepository)
    })

    // Register lobby use cases (Event-Driven architecture)
    this.app.container.singleton(CreateLobbyUseCase, async (resolver) => {
      const playerRepository = await resolver.make(InMemoryPlayerRepository)
      const lobbyRepository = await resolver.make(InMemoryLobbyRepository)
      return new CreateLobbyUseCase(playerRepository, lobbyRepository)
    })

    this.app.container.singleton(JoinLobbyUseCase, async (resolver) => {
      const playerRepository = await resolver.make(InMemoryPlayerRepository)
      const lobbyRepository = await resolver.make(InMemoryLobbyRepository)
      return new JoinLobbyUseCase(playerRepository, lobbyRepository)
    })

    this.app.container.singleton(LeaveLobbyUseCase, async (resolver) => {
      const lobbyRepository = await resolver.make(InMemoryLobbyRepository)
      return new LeaveLobbyUseCase(lobbyRepository)
    })

    this.app.container.singleton(StartGameUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const gameRepository = await resolver.make(DatabaseGameRepository)
      const notificationService = await resolver.make(TransmitLobbyService)
      return new StartGameUseCase(hybridLobbyService, gameRepository as any, notificationService)
    })

    this.app.container.singleton(ListLobbiesUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new ListLobbiesUseCase(hybridLobbyService)
    })

    this.app.container.singleton(ShowLobbyUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new ShowLobbyUseCase(hybridLobbyService)
    })
  }
}

/**
 * Define static types for container bindings using TypeScript declaration merging
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    // Define our custom bindings here if needed
    // For now, we use class constructors directly which don't need explicit typing
  }
}
