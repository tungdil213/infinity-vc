import { ApplicationService } from '@adonisjs/core/types'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyNotificationService } from '#application/services/lobby_notification_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import AuthenticateUserUseCase from '#application/use_cases/authenticate_user_use_case'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'
import { ShowLobbyUseCase } from '#application/use_cases/show_lobby_use_case'
import { KickPlayerUseCase } from '#application/use_cases/kick_player_use_case'
import { UpdateLobbySettingsUseCase } from '#application/use_cases/update_lobby_settings_use_case'
import { SetPlayerReadyUseCase } from '#application/use_cases/set_player_ready_use_case'
import LobbyController from '#controllers/lobby_controller'

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
    this.app.container.singleton(LobbyNotificationService, () => {
      return new LobbyNotificationService()
    })

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

    // Register lobby use cases
    this.app.container.singleton(CreateLobbyUseCase, async (resolver) => {
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const notificationService = await resolver.make(TransmitLobbyService)
      return new CreateLobbyUseCase(playerRepository, hybridLobbyService, notificationService)
    })

    this.app.container.singleton(JoinLobbyUseCase, async (resolver) => {
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const notificationService = await resolver.make(LobbyNotificationService)
      return new JoinLobbyUseCase(playerRepository, hybridLobbyService, notificationService)
    })

    this.app.container.singleton(LeaveLobbyUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new LeaveLobbyUseCase(hybridLobbyService)
    })

    this.app.container.singleton(StartGameUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const gameRepository = await resolver.make(DatabaseGameRepository)
      return new StartGameUseCase(hybridLobbyService, gameRepository as any)
    })

    this.app.container.singleton(ListLobbiesUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new ListLobbiesUseCase(hybridLobbyService)
    })

    this.app.container.singleton(ShowLobbyUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new ShowLobbyUseCase(hybridLobbyService)
    })

    this.app.container.singleton(KickPlayerUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      return new KickPlayerUseCase(hybridLobbyService, playerRepository, null as any)
    })

    this.app.container.singleton(UpdateLobbySettingsUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new UpdateLobbySettingsUseCase(hybridLobbyService, null as any)
    })

    this.app.container.singleton(SetPlayerReadyUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      return new SetPlayerReadyUseCase(hybridLobbyService, playerRepository, null as any)
    })

    // Register controllers
    this.app.container.singleton(LobbyController, async (resolver) => {
      const createLobbyUseCase = await resolver.make(CreateLobbyUseCase)
      const joinLobbyUseCase = await resolver.make(JoinLobbyUseCase)
      const leaveLobbyUseCase = await resolver.make(LeaveLobbyUseCase)
      const listLobbiesUseCase = await resolver.make(ListLobbiesUseCase)
      const startGameUseCase = await resolver.make(StartGameUseCase)
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new LobbyController(
        createLobbyUseCase,
        joinLobbyUseCase,
        leaveLobbyUseCase,
        listLobbiesUseCase,
        startGameUseCase,
        hybridLobbyService
      )
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
