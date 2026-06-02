import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { AcceptFriendRequestUseCase } from '#application/use_cases/accept_friend_request_use_case'
import { CancelSentFriendRequestUseCase } from '#application/use_cases/cancel_sent_friend_request_use_case'
import { ClearSocialPresenceUseCase } from '#application/use_cases/clear_social_presence_use_case'
import { HeartbeatSocialPresenceUseCase } from '#application/use_cases/heartbeat_social_presence_use_case'
import { ListFriendPresenceUseCase } from '#application/use_cases/list_friend_presence_use_case'
import { ListFriendsUseCase } from '#application/use_cases/list_friends_use_case'
import { RejectFriendRequestUseCase } from '#application/use_cases/reject_friend_request_use_case'
import { RemoveFriendUseCase } from '#application/use_cases/remove_friend_use_case'
import { SearchUsersUseCase } from '#application/use_cases/search_users_use_case'
import { SendFriendRequestUseCase } from '#application/use_cases/send_friend_request_use_case'
import { DatabaseFriendRepository } from '#infrastructure/repositories/database_friend_repository'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { InMemorySocialPresenceRepository } from '#infrastructure/repositories/in_memory_social_presence_repository'
import { EventBusSocialPresenceNotifier } from '#infrastructure/services/event_bus_social_presence_notifier'
import { LiveSocialPresenceContextResolver } from '#infrastructure/services/live_social_presence_context_resolver'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerSocialBindings(registrar: BindingRegistrar): void {
  registrar.singleton(DatabaseFriendRepository, () => {
    return new DatabaseFriendRepository()
  })

  registrar.singleton(InMemorySocialPresenceRepository, () => {
    return new InMemorySocialPresenceRepository()
  })

  registrar.singleton(LiveSocialPresenceContextResolver, async (resolver) => {
    const gameRepository = await resolver.make(DatabaseGameRepository)
    const hybridLobbyService = await resolver.make(HybridLobbyService)
    return new LiveSocialPresenceContextResolver(gameRepository, hybridLobbyService)
  })

  registrar.singleton(EventBusSocialPresenceNotifier, () => {
    return new EventBusSocialPresenceNotifier()
  })

  registrar.singleton(ListFriendsUseCase, async (resolver) => {
    const friendRepository = await resolver.make(DatabaseFriendRepository)
    return new ListFriendsUseCase(friendRepository)
  })

  registrar.singleton(SearchUsersUseCase, async (resolver) => {
    const friendRepository = await resolver.make(DatabaseFriendRepository)
    return new SearchUsersUseCase(friendRepository)
  })

  registrar.singleton(SendFriendRequestUseCase, async (resolver) => {
    const friendRepository = await resolver.make(DatabaseFriendRepository)
    const userRepository = await resolver.make(DatabaseUserRepository)
    return new SendFriendRequestUseCase(friendRepository, userRepository)
  })

  registrar.singleton(AcceptFriendRequestUseCase, async (resolver) => {
    const friendRepository = await resolver.make(DatabaseFriendRepository)
    return new AcceptFriendRequestUseCase(friendRepository)
  })

  registrar.singleton(RejectFriendRequestUseCase, async (resolver) => {
    const friendRepository = await resolver.make(DatabaseFriendRepository)
    return new RejectFriendRequestUseCase(friendRepository)
  })

  registrar.singleton(CancelSentFriendRequestUseCase, async (resolver) => {
    const friendRepository = await resolver.make(DatabaseFriendRepository)
    return new CancelSentFriendRequestUseCase(friendRepository)
  })

  registrar.singleton(RemoveFriendUseCase, async (resolver) => {
    const friendRepository = await resolver.make(DatabaseFriendRepository)
    return new RemoveFriendUseCase(friendRepository)
  })

  registrar.singleton(ListFriendPresenceUseCase, async (resolver) => {
    const friendRepository = await resolver.make(DatabaseFriendRepository)
    const socialPresenceRepository = await resolver.make(InMemorySocialPresenceRepository)
    return new ListFriendPresenceUseCase(friendRepository, socialPresenceRepository)
  })

  registrar.singleton(HeartbeatSocialPresenceUseCase, async (resolver) => {
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

  registrar.singleton(ClearSocialPresenceUseCase, async (resolver) => {
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
}
