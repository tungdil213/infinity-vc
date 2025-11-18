import { test } from '@japa/runner'
import { StartGameHandler } from '#lobby/application/commands/start_game/start_game.handler'
import { StartGameCommand } from '#lobby/application/commands/start_game/start_game.command'
import { LobbyRepositoryInMemory } from '#lobby/infrastructure/persistence/lobby_repository.in_memory'
import { LobbySettings } from '#lobby/domain/value_objects/lobby_settings.vo'
import { Lobby } from '#lobby/domain/entities/lobby.entity'
import { LobbyAggregate } from '#lobby/domain/aggregates/lobby.aggregate'
import { Player } from '#lobby/domain/entities/player.entity'
import { LobbyStatus } from '#lobby/domain/value_objects/lobby_status.vo'
import type { LobbyRepository } from '#lobby/domain/repositories/lobby_repository.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import type { DomainEvent } from '#shared_kernel/domain/events/domain_event'
import { Result } from '#shared_kernel/domain/result'

class FakeEventBus implements EventBus {
  public published: DomainEvent[] = []

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event)
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    this.published.push(...events)
  }

  subscribe(): void {}
  unsubscribe(): void {}
}

async function createLobbyWithPlayers(options?: {
  maxPlayers?: number
  minPlayers?: number
  additionalPlayers?: number
  readyNonOwners?: boolean
}): Promise<{
  aggregate: LobbyAggregate
  repository: LobbyRepositoryInMemory
  ownerId: string
  otherUserIds: string[]
}> {
  const repository = new LobbyRepositoryInMemory()
  const ownerId = 'owner-1'

  const settingsResult = LobbySettings.create({
    name: 'Test Lobby',
    maxPlayers: options?.maxPlayers ?? 4,
    minPlayers: options?.minPlayers ?? 2,
    isPrivate: false,
    gameType: 'default',
  })

  if (settingsResult.isFailure) {
    throw new Error(settingsResult.error)
  }

  const lobbyResult = Lobby.create({
    ownerId,
    settings: settingsResult.value,
    status: LobbyStatus.WAITING,
  })

  if (lobbyResult.isFailure) {
    throw new Error(lobbyResult.error)
  }

  const aggregate = LobbyAggregate.create(lobbyResult.value)

  const ownerResult = Player.create({
    userId: ownerId,
    username: 'Owner',
    lobbyId: aggregate.id,
    isOwner: true,
  })
  if (ownerResult.isFailure) {
    throw new Error(ownerResult.error)
  }
  const addOwner = aggregate.addPlayer(ownerResult.value)
  if (addOwner.isFailure) {
    throw new Error(addOwner.error)
  }

  const additionalPlayers = options?.additionalPlayers ?? 0
  const otherUserIds: string[] = []

  for (let i = 0; i < additionalPlayers; i++) {
    const userId = `user-${i + 1}`
    const playerResult = Player.create({
      userId,
      username: `Player ${i + 1}`,
      lobbyId: aggregate.id,
      isOwner: false,
    })

    if (playerResult.isFailure) {
      throw new Error(playerResult.error)
    }

    const addResult = aggregate.addPlayer(playerResult.value)
    if (addResult.isFailure) {
      throw new Error(addResult.error)
    }

    otherUserIds.push(userId)
  }

  if (options?.readyNonOwners) {
    for (const player of aggregate.playersList) {
      if (!player.isOwner) {
        const readyResult = player.setReady(true)
        if (readyResult.isFailure) {
          throw new Error(readyResult.error)
        }
      }
    }
  }

  const saveResult = await repository.save(aggregate)
  if (saveResult.isFailure) {
    throw new Error(saveResult.error)
  }

  return {
    aggregate,
    repository,
    ownerId,
    otherUserIds,
  }
}

class FailingSaveLobbyRepository extends LobbyRepositoryInMemory implements LobbyRepository {
  async save(aggregate: LobbyAggregate): Promise<Result<LobbyAggregate>> {
    await super.save(aggregate)
    return Result.fail('Persistence error')
  }
}

test.group('Lobby - StartGameHandler', () => {
  test('should start game successfully when owner starts with enough ready players', async ({ assert }) => {
    const { aggregate, repository, ownerId } = await createLobbyWithPlayers({
      additionalPlayers: 1,
      minPlayers: 2,
      readyNonOwners: true,
    })
    const eventBus = new FakeEventBus()
    const handler = new StartGameHandler(repository, eventBus)

    const command = new StartGameCommand(aggregate.id, ownerId, 'game-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isSuccess)

    const storedResult = await repository.findById(aggregate.id)
    assert.isTrue(storedResult.isSuccess)
    const stored = storedResult.value
    assert.exists(stored)
    assert.equal(stored?.lobbyEntity.gameId, 'game-1')
    assert.equal(stored?.lobbyEntity.status, LobbyStatus.STARTING)
    assert.isAtLeast(eventBus.published.length, 1)
  })

  test('should fail when lobby is not found', async ({ assert }) => {
    const repository = new LobbyRepositoryInMemory()
    const eventBus = new FakeEventBus()
    const handler = new StartGameHandler(repository, eventBus)

    const command = new StartGameCommand('non-existent-lobby', 'owner-1', 'game-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby not found')
  })

  test('should fail when user is not lobby owner', async ({ assert }) => {
    const { aggregate, repository, otherUserIds } = await createLobbyWithPlayers({
      additionalPlayers: 1,
      minPlayers: 2,
      readyNonOwners: true,
    })
    const eventBus = new FakeEventBus()
    const handler = new StartGameHandler(repository, eventBus)

    const nonOwnerId = otherUserIds[0]
    const command = new StartGameCommand(aggregate.id, nonOwnerId, 'game-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Only lobby owner can start game')
  })

  test('should fail when not enough players to start game', async ({ assert }) => {
    const { aggregate, repository, ownerId } = await createLobbyWithPlayers({
      additionalPlayers: 0,
      minPlayers: 2,
    })
    const eventBus = new FakeEventBus()
    const handler = new StartGameHandler(repository, eventBus)

    const command = new StartGameCommand(aggregate.id, ownerId, 'game-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Not enough players to start game')
  })

  test('should fail when not all players are ready', async ({ assert }) => {
    const { aggregate, repository, ownerId } = await createLobbyWithPlayers({
      additionalPlayers: 1,
      minPlayers: 2,
      readyNonOwners: false,
    })
    const eventBus = new FakeEventBus()
    const handler = new StartGameHandler(repository, eventBus)

    const command = new StartGameCommand(aggregate.id, ownerId, 'game-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Not all players are ready')
  })

  test('should propagate repository save errors', async ({ assert }) => {
    const { aggregate } = await createLobbyWithPlayers({
      additionalPlayers: 1,
      minPlayers: 2,
      readyNonOwners: true,
    })
    const repository = new FailingSaveLobbyRepository()
    const eventBus = new FakeEventBus()
    const handler = new StartGameHandler(repository, eventBus)

    // Seed failing repository with aggregate
    await repository.save(aggregate)

    const command = new StartGameCommand(aggregate.id, 'owner-1', 'game-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Persistence error')
  })
})
