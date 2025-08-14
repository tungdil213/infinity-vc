import { ApplicationService } from '@adonisjs/core/types'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import AuthenticateUserUseCase from '#application/use_cases/authenticate_user_use_case'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'

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

    this.app.container.singleton(DatabaseGameRepository, () => {
      return new DatabaseGameRepository()
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
      const lobbyRepository = await resolver.make(DatabaseLobbyRepository)
      return new CreateLobbyUseCase(playerRepository, lobbyRepository)
    })

    this.app.container.singleton(JoinLobbyUseCase, async (resolver) => {
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      const lobbyRepository = await resolver.make(DatabaseLobbyRepository)
      return new JoinLobbyUseCase(playerRepository, lobbyRepository)
    })

    this.app.container.singleton(LeaveLobbyUseCase, async (resolver) => {
      const lobbyRepository = await resolver.make(DatabaseLobbyRepository)
      return new LeaveLobbyUseCase(lobbyRepository)
    })

    this.app.container.singleton(StartGameUseCase, async (resolver) => {
      const lobbyRepository = await resolver.make(DatabaseLobbyRepository)
      const gameRepository = await resolver.make(DatabaseGameRepository)
      return new StartGameUseCase(lobbyRepository, gameRepository)
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
