import logger from '@adonisjs/core/services/logger'
import { type ApplicationService } from '@adonisjs/core/types'
import { EventBusDomainEventPublisher } from '#application/services/domain_event_publisher'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { LobbyEventService } from '#application/services/lobby_event_service'
import { LobbyPresenceService } from '#application/services/lobby_presence_service'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { AcceptFriendRequestUseCase } from '#application/use_cases/accept_friend_request_use_case'
import { CancelSentFriendRequestUseCase } from '#application/use_cases/cancel_sent_friend_request_use_case'
import { ClearSocialPresenceUseCase } from '#application/use_cases/clear_social_presence_use_case'
import { CloseLobbyUseCase } from '#application/use_cases/close_lobby_use_case'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { GenerateInvitationCodeUseCase } from '#application/use_cases/generate_invitation_code_use_case'
import { HeartbeatSocialPresenceUseCase } from '#application/use_cases/heartbeat_social_presence_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { KickPlayerUseCase } from '#application/use_cases/kick_player_use_case'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'
import { ListFriendPresenceUseCase } from '#application/use_cases/list_friend_presence_use_case'
import { ListFriendsUseCase } from '#application/use_cases/list_friends_use_case'
import { ListGameCatalogUseCase } from '#application/use_cases/list_game_catalog_use_case'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'
import { ListMyInvitationsUseCase } from '#application/use_cases/list_my_invitations_use_case'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import { RegisterWithInvitationUseCase } from '#application/use_cases/register_with_invitation_use_case'
import { RejectFriendRequestUseCase } from '#application/use_cases/reject_friend_request_use_case'
import { RemoveFriendUseCase } from '#application/use_cases/remove_friend_use_case'
import { RevokeInvitationCodeUseCase } from '#application/use_cases/revoke_invitation_code_use_case'
import { SearchUsersUseCase } from '#application/use_cases/search_users_use_case'
import { SendFriendRequestUseCase } from '#application/use_cases/send_friend_request_use_case'
import { SetPlayerReadyUseCase } from '#application/use_cases/set_player_ready_use_case'
import { ShowLobbyUseCase } from '#application/use_cases/show_lobby_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { UpdateLobbySettingsUseCase } from '#application/use_cases/update_lobby_settings_use_case'
import { ValidateInvitationCodeUseCase } from '#application/use_cases/validate_invitation_code_use_case'
import { initializeAppGameLauncher } from '#infrastructure/game_engine/app_game_launcher'
import { defaultGameCatalog } from '#infrastructure/game_engine/launcher_game_catalog'
import { DatabaseFriendRepository } from '#infrastructure/repositories/database_friend_repository'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { InMemorySocialPresenceRepository } from '#infrastructure/repositories/in_memory_social_presence_repository'
import { EventBusSocialPresenceNotifier } from '#infrastructure/services/event_bus_social_presence_notifier'
import { LiveSocialPresenceContextResolver } from '#infrastructure/services/live_social_presence_context_resolver'
import { eventBridgeService } from '#infrastructure/transcript/index'
import env from '#start/env'

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

    this.app.container.singleton(DatabaseFriendRepository, () => {
      return new DatabaseFriendRepository()
    })

    this.app.container.singleton(InMemorySocialPresenceRepository, () => {
      return new InMemorySocialPresenceRepository()
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

    this.app.container.singleton(LiveSocialPresenceContextResolver, async (resolver) => {
      const gameRepository = await resolver.make(DatabaseGameRepository)
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new LiveSocialPresenceContextResolver(gameRepository, hybridLobbyService)
    })

    this.app.container.singleton(EventBusSocialPresenceNotifier, () => {
      return new EventBusSocialPresenceNotifier()
    })

    // Register use cases as singletons with dependency injection
    this.app.container.singleton(RegisterUserUseCase, async (resolver) => {
      const userRepository = await resolver.make(DatabaseUserRepository)
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      return new RegisterUserUseCase(userRepository, playerRepository)
    })

    // Register lobby use cases
    this.app.container.singleton(CreateLobbyUseCase, async (resolver) => {
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const notificationService = await resolver.make(TransmitLobbyService)
      return new CreateLobbyUseCase(
        playerRepository,
        hybridLobbyService,
        notificationService,
        defaultGameCatalog
      )
    })

    this.app.container.singleton(JoinLobbyUseCase, async (resolver) => {
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const notificationService = await resolver.make(TransmitLobbyService)
      return new JoinLobbyUseCase(playerRepository, hybridLobbyService, notificationService)
    })

    this.app.container.singleton(LeaveLobbyUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const notificationService = await resolver.make(TransmitLobbyService)
      const eventService = await resolver.make(LobbyEventService)
      return new LeaveLobbyUseCase(hybridLobbyService, notificationService, eventService)
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

    this.app.container.singleton(ListFriendsUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      return new ListFriendsUseCase(friendRepository)
    })

    this.app.container.singleton(SearchUsersUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      return new SearchUsersUseCase(friendRepository)
    })

    this.app.container.singleton(SendFriendRequestUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      return new SendFriendRequestUseCase(friendRepository)
    })

    this.app.container.singleton(AcceptFriendRequestUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      return new AcceptFriendRequestUseCase(friendRepository)
    })

    this.app.container.singleton(RejectFriendRequestUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      return new RejectFriendRequestUseCase(friendRepository)
    })

    this.app.container.singleton(CancelSentFriendRequestUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      return new CancelSentFriendRequestUseCase(friendRepository)
    })

    this.app.container.singleton(RemoveFriendUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      return new RemoveFriendUseCase(friendRepository)
    })

    this.app.container.singleton(ListFriendPresenceUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      const socialPresenceRepository = await resolver.make(InMemorySocialPresenceRepository)
      return new ListFriendPresenceUseCase(friendRepository, socialPresenceRepository)
    })

    this.app.container.singleton(HeartbeatSocialPresenceUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      const socialPresenceRepository = await resolver.make(InMemorySocialPresenceRepository)
      const contextResolver = await resolver.make(LiveSocialPresenceContextResolver)
      const notifier = await resolver.make(EventBusSocialPresenceNotifier)
      return new HeartbeatSocialPresenceUseCase(
        friendRepository,
        socialPresenceRepository,
        contextResolver,
        notifier
      )
    })

    this.app.container.singleton(ClearSocialPresenceUseCase, async (resolver) => {
      const friendRepository = await resolver.make(DatabaseFriendRepository)
      const socialPresenceRepository = await resolver.make(InMemorySocialPresenceRepository)
      const contextResolver = await resolver.make(LiveSocialPresenceContextResolver)
      const notifier = await resolver.make(EventBusSocialPresenceNotifier)
      return new ClearSocialPresenceUseCase(
        friendRepository,
        socialPresenceRepository,
        contextResolver,
        notifier
      )
    })

    this.app.container.singleton(ShowLobbyUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      return new ShowLobbyUseCase(hybridLobbyService)
    })

    this.app.container.singleton(KickPlayerUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      const domainEventPublisher = await resolver.make(EventBusDomainEventPublisher)
      return new KickPlayerUseCase(hybridLobbyService, playerRepository, domainEventPublisher)
    })

    this.app.container.singleton(CloseLobbyUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const eventService = await resolver.make(LobbyEventService)
      return new CloseLobbyUseCase(hybridLobbyService, eventService)
    })

    this.app.container.singleton(UpdateLobbySettingsUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const domainEventPublisher = await resolver.make(EventBusDomainEventPublisher)
      return new UpdateLobbySettingsUseCase(hybridLobbyService, domainEventPublisher)
    })

    this.app.container.singleton(SetPlayerReadyUseCase, async (resolver) => {
      const hybridLobbyService = await resolver.make(HybridLobbyService)
      const playerRepository = await resolver.make(DatabasePlayerRepository)
      const domainEventPublisher = await resolver.make(EventBusDomainEventPublisher)
      return new SetPlayerReadyUseCase(hybridLobbyService, playerRepository, domainEventPublisher)
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
