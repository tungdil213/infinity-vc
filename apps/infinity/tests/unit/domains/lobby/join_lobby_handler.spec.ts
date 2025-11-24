import { test } from '@japa/runner'
import { JoinLobbyHandler } from '#lobby/application/commands/join_lobby/join_lobby.handler'
import { JoinLobbyCommand } from '#lobby/application/commands/join_lobby/join_lobby.command'
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

async function createLobbyInRepository(options?: {
  maxPlayers?: number
  minPlayers?: number
  isPrivate?: boolean
}): Promise<{ aggregate: LobbyAggregate; repository: LobbyRepositoryInMemory }> {
  const repository = new LobbyRepositoryInMemory()

  const settingsResult = LobbySettings.create({
    name: 'Test Lobby',
    maxPlayers: options?.maxPlayers ?? 4,
    minPlayers: options?.minPlayers ?? 2,
    isPrivate: options?.isPrivate ?? false,
    gameType: 'default',
  })

  if (settingsResult.isFailure) {
    throw new Error(settingsResult.error)
  }

  const lobbyResult = Lobby.create({
    ownerId: 'owner-1',
    settings: settingsResult.value,
    status: LobbyStatus.WAITING,
  })
  if (lobbyResult.isFailure) {
    throw new Error(lobbyResult.error)
  }

  const aggregate = LobbyAggregate.create(lobbyResult.value)
  const saveResult = await repository.save(aggregate)
  if (saveResult.isFailure) {
    throw new Error(saveResult.error)
  }

  return { aggregate, repository }
}

class FailingLobbyRepository extends LobbyRepositoryInMemory implements LobbyRepository {
  async findById(): Promise<Result<LobbyAggregate | null>> {
    return Result.fail('Database error')
  }
}

test.group('Lobby - JoinLobbyHandler', () => {
  test('should join lobby successfully with valid data', async ({ assert }) => {
    const { aggregate, repository } = await createLobbyInRepository()
    const eventBus = new FakeEventBus()
    const handler = new JoinLobbyHandler(repository, eventBus)

    const command = new JoinLobbyCommand(aggregate.id, 'user-1', 'Player 1')
    const result = await handler.handle(command)

    assert.isTrue(result.isSuccess)

    const storedResult = await repository.findById(aggregate.id)
    assert.isTrue(storedResult.isSuccess)
    const stored = storedResult.value
    assert.exists(stored)
    assert.equal(stored?.playersList.length, 1)
    assert.isAtLeast(eventBus.published.length, 1)
  })

  test('should fail when lobby is not found', async ({ assert }) => {
    const repository = new LobbyRepositoryInMemory()
    const eventBus = new FakeEventBus()
    const handler = new JoinLobbyHandler(repository, eventBus)

    const command = new JoinLobbyCommand('non-existent-lobby', 'user-1', 'Player 1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby not found')
  })

  test('should fail when player is already in lobby', async ({ assert }) => {
    const { aggregate, repository } = await createLobbyInRepository()
    const eventBus = new FakeEventBus()

    // Add player once
    const playerResult = Player.create({
      userId: 'user-1',
      username: 'Player 1',
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

    await repository.save(aggregate)

    const handler = new JoinLobbyHandler(repository, eventBus)

    const command = new JoinLobbyCommand(aggregate.id, 'user-1', 'Player 1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Player already in lobby')
  })

  test('should fail when lobby is full', async ({ assert }) => {
    const { aggregate, repository } = await createLobbyInRepository({
      maxPlayers: 2,
      minPlayers: 2,
    })
    const eventBus = new FakeEventBus()

    // Fill the lobby with two players
    const player1Result = Player.create({
      userId: 'user-1',
      username: 'Player 1',
      lobbyId: aggregate.id,
      isOwner: false,
    })
    const player2Result = Player.create({
      userId: 'user-2',
      username: 'Player 2',
      lobbyId: aggregate.id,
      isOwner: false,
    })

    if (player1Result.isFailure || player2Result.isFailure) {
      throw new Error('Failed to create players')
    }

    const add1 = aggregate.addPlayer(player1Result.value)
    const add2 = aggregate.addPlayer(player2Result.value)

    if (add1.isFailure || add2.isFailure) {
      throw new Error('Failed to add players to lobby')
    }

    await repository.save(aggregate)

    const handler = new JoinLobbyHandler(repository, eventBus)
    const command = new JoinLobbyCommand(aggregate.id, 'user-3', 'Player 3')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby is full')
  })

  test('should map repository failures to lobby not found', async ({ assert }) => {
    const repository = new FailingLobbyRepository()
    const eventBus = new FakeEventBus()
    const handler = new JoinLobbyHandler(repository, eventBus)

    const command = new JoinLobbyCommand('any-lobby', 'user-1', 'Player 1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby not found')
  })
})
