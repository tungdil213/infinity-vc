import logger from '@adonisjs/core/services/logger'
import { type ApplicationService } from '@adonisjs/core/types'
import { EventBusDomainEventPublisher } from '#application/services/domain_event_publisher'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { LobbyPresenceService } from '#application/services/lobby_presence_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { GenerateInvitationCodeUseCase } from '#application/use_cases/generate_invitation_code_use_case'
import { ListGameCatalogUseCase } from '#application/use_cases/list_game_catalog_use_case'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'
import { ListMyInvitationsUseCase } from '#application/use_cases/list_my_invitations_use_case'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import { RegisterWithInvitationUseCase } from '#application/use_cases/register_with_invitation_use_case'
import { RevokeInvitationCodeUseCase } from '#application/use_cases/revoke_invitation_code_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { ValidateInvitationCodeUseCase } from '#application/use_cases/validate_invitation_code_use_case'
import { initializeAppGameLauncher } from '#infrastructure/game_engine/app_game_launcher'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { eventBridgeService } from '#infrastructure/transcript/index'
import env from '#start/env'
import { registerLobbyEntryBindings } from './bindings/lobby_entry_bindings.js'
import { registerLobbyExitBindings } from './bindings/lobby_exit_bindings.js'
import { registerLobbyManagementBindings } from './bindings/lobby_management_bindings.js'
import { registerSocialBindings } from './bindings/social_bindings.js'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Called when the application is ready to accept HTTP requests
   */
  async ready() {
    await initializeAppGameLauncher()
    // Initialize EventBridge to connect domain events to Transmit
    await eventBridgeService.initialize()
    logger.info('[AppProvider] EventBridge initialized')
  }

  /**
   * Called when the application is shutting down
   */
  async shutdown() {
    eventBridgeService.stop()
    logger.info('[AppProvider] EventBridge stopped')
  }

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

    this.app.container.singleton(DatabaseInvitationRepository, () => {
      return new DatabaseInvitationRepository()
    })

    // Register services as singletons
    this.app.container.singleton(EventBusDomainEventPublisher, () => {
      return new EventBusDomainEventPublisher()
    })

    // Register Transmit-based lobby service
    this.app.container.singleton(TransmitLobbyService, () => {
      return new TransmitLobbyService()
    })

    // Register LobbyEventService
    this.app.container.singleton(LobbyEventService, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new LobbyEventService(hybridLobbyService)
    })

    this.app.container.singleton(LobbyPresenceService, () => {
      return new LobbyPresenceService()
    })

    // Register use cases as singletons with dependency injection
    this.app.container.singleton(RegisterUserUseCase, async (resolver) => {
      const userRepository = await resolver.make(DatabaseUserRepository)
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      return new RegisterUserUseCase(userRepository, playerRepository)
    })

    // Register lobby use cases
    registerLobbyEntryBindings(this.app.container)

    registerLobbyExitBindings(this.app.container)

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

    this.app.container.singleton(ListGameCatalogUseCase, () => {
      return new ListGameCatalogUseCase()
    })

    this.app.container.singleton(ValidateInvitationCodeUseCase, async (resolver) => {
      const invitationRepository = await resolver.make(DatabaseInvitationRepository)
      return new ValidateInvitationCodeUseCase(invitationRepository)
    })

    this.app.container.singleton(RegisterWithInvitationUseCase, async (resolver) => {
      const invitationRepository = await resolver.make(DatabaseInvitationRepository)
      return new RegisterWithInvitationUseCase(invitationRepository)
    })

    this.app.container.singleton(GenerateInvitationCodeUseCase, async (resolver) => {
      const invitationRepository = await resolver.make(DatabaseInvitationRepository)
      return new GenerateInvitationCodeUseCase(
        invitationRepository,
        env.get('INVITATION_CODE_QUOTA_PER_USER') ?? 5,
        env.get('INVITATION_CODE_TTL_HOURS') ?? 168
      )
    })

    this.app.container.singleton(ListMyInvitationsUseCase, async (resolver) => {
      const invitationRepository = await resolver.make(DatabaseInvitationRepository)
      return new ListMyInvitationsUseCase(invitationRepository)
    })

    this.app.container.singleton(RevokeInvitationCodeUseCase, async (resolver) => {
      const invitationRepository = await resolver.make(DatabaseInvitationRepository)
      return new RevokeInvitationCodeUseCase(invitationRepository)
    })

    registerSocialBindings(this.app.container)

    registerLobbyManagementBindings(this.app.container)
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
