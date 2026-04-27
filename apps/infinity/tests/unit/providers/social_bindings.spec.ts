import { test } from '@japa/runner'
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
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { InMemorySocialPresenceRepository } from '#infrastructure/repositories/in_memory_social_presence_repository'
import { EventBusSocialPresenceNotifier } from '#infrastructure/services/event_bus_social_presence_notifier'
import { LiveSocialPresenceContextResolver } from '#infrastructure/services/live_social_presence_context_resolver'
import {
  registerSocialBindings,
  type BindingRegistrar,
  type BindingResolver,
} from '../../../providers/bindings/social_bindings.js'

type ContainerBinding<T> = abstract new (...args: never[]) => T

type BindingFactory<T> = (resolver: BindingResolver) => T | Promise<T>

class RecordingBindingRegistrar implements BindingRegistrar {
  readonly bindings = new Map<ContainerBinding<unknown>, BindingFactory<unknown>>()

  singleton<T>(binding: ContainerBinding<T>, factory: BindingFactory<T>): void {
    this.bindings.set(binding, factory as BindingFactory<unknown>)
  }
}

class MapBindingResolver implements BindingResolver {
  constructor(private readonly values: Map<ContainerBinding<unknown>, unknown>) {}

  async make<T>(binding: ContainerBinding<T>): Promise<T> {
    const value = this.values.get(binding)
    if (value === undefined) {
      throw new Error(`Missing binding for ${binding.name}`)
    }

    return value as T
  }
}

test.group('social_bindings', () => {
  test('registers the expected social bindings and preserves their class tokens', ({ assert }) => {
    const registrar = new RecordingBindingRegistrar()

    registerSocialBindings(registrar)

    const registeredBindings = [...registrar.bindings.keys()]

    assert.deepEqual(registeredBindings, [
      DatabaseFriendRepository,
      InMemorySocialPresenceRepository,
      LiveSocialPresenceContextResolver,
      EventBusSocialPresenceNotifier,
      ListFriendsUseCase,
      SearchUsersUseCase,
      SendFriendRequestUseCase,
      AcceptFriendRequestUseCase,
      RejectFriendRequestUseCase,
      CancelSentFriendRequestUseCase,
      RemoveFriendUseCase,
      ListFriendPresenceUseCase,
      HeartbeatSocialPresenceUseCase,
      ClearSocialPresenceUseCase,
    ])
  })

  test('resolves representative social bindings with the same dependency graph', async ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()
    registerSocialBindings(registrar)

    const friendRepository = new DatabaseFriendRepository()
    const socialPresenceRepository = new InMemorySocialPresenceRepository()
    const userRepository = new DatabaseUserRepository()
    const gameRepository = new DatabaseGameRepository()
    const hybridLobbyService = new HybridLobbyService(
      new InMemoryLobbyRepository(),
      new DatabaseLobbyRepository()
    )
    const contextResolver = new LiveSocialPresenceContextResolver(
      gameRepository,
      hybridLobbyService
    )
    const notifier = new EventBusSocialPresenceNotifier()

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([
        [DatabaseFriendRepository, friendRepository],
        [InMemorySocialPresenceRepository, socialPresenceRepository],
        [DatabaseUserRepository, userRepository],
        [DatabaseGameRepository, gameRepository],
        [HybridLobbyService, hybridLobbyService],
        [LiveSocialPresenceContextResolver, contextResolver],
        [EventBusSocialPresenceNotifier, notifier],
      ])
    )

    const sendFriendRequestFactory = registrar.bindings.get(SendFriendRequestUseCase)
    const heartbeatFactory = registrar.bindings.get(HeartbeatSocialPresenceUseCase)
    const clearPresenceFactory = registrar.bindings.get(ClearSocialPresenceUseCase)

    assert.exists(sendFriendRequestFactory)
    assert.exists(heartbeatFactory)
    assert.exists(clearPresenceFactory)

    const sendFriendRequestUseCase = await sendFriendRequestFactory!(resolver)
    const heartbeatUseCase = await heartbeatFactory!(resolver)
    const clearPresenceUseCase = await clearPresenceFactory!(resolver)

    assert.instanceOf(sendFriendRequestUseCase, SendFriendRequestUseCase)
    assert.instanceOf(heartbeatUseCase, HeartbeatSocialPresenceUseCase)
    assert.instanceOf(clearPresenceUseCase, ClearSocialPresenceUseCase)
  })
})
