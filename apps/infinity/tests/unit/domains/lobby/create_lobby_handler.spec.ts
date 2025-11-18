import { test } from '@japa/runner'
import { CreateLobbyHandler } from '#lobby/application/commands/create_lobby/create_lobby.handler'
import { CreateLobbyCommand } from '#lobby/application/commands/create_lobby/create_lobby.command'
import { LobbyRepositoryInMemory } from '#lobby/infrastructure/persistence/lobby_repository.in_memory'
import type { LobbyAggregate } from '#lobby/domain/aggregates/lobby.aggregate'
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

function makeSut() {
  const repository = new LobbyRepositoryInMemory()
  const eventBus = new FakeEventBus()
  const handler = new CreateLobbyHandler(repository, eventBus)

  return { repository, eventBus, handler }
}

class FailingLobbyRepository extends LobbyRepositoryInMemory {
  async save(): Promise<Result<LobbyAggregate>> {
    return Result.fail('Persistence error')
  }
}

test.group('Lobby - CreateLobbyHandler', () => {
  test('should create lobby successfully with valid data', async ({ assert }) => {
    const { handler, eventBus } = makeSut()

    const command = new CreateLobbyCommand('owner-1', 'Owner', 'Test Lobby', 4, 2, false, 'default')

    const result = await handler.handle(command)

    assert.isTrue(result.isSuccess)
    const aggregate = result.value
    assert.exists(aggregate)
    assert.equal(aggregate?.lobbyEntity.settings.name, 'Test Lobby')
    assert.equal(aggregate?.lobbyEntity.settings.maxPlayers, 4)
    assert.equal(aggregate?.lobbyEntity.settings.minPlayers, 2)
    assert.equal(aggregate?.lobbyEntity.settings.isPrivate, false)
    assert.equal(aggregate?.lobbyEntity.ownerId, 'owner-1')

    // Owner should be auto-joined as first player
    assert.equal(aggregate?.playersList.length, 1)
    const ownerPlayer = aggregate?.playersList[0]
    assert.equal(ownerPlayer?.userId, 'owner-1')
    assert.equal(ownerPlayer?.username, 'Owner')
    assert.isTrue(ownerPlayer?.isOwner === true)

    // Domain events should be published
    assert.isAtLeast(eventBus.published.length, 1)
  })

  test('should fail when lobby name is empty', async ({ assert }) => {
    const { handler } = makeSut()

    const command = new CreateLobbyCommand('owner-1', 'Owner', '', 4, 2, false, 'default')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby name cannot be empty')
  })

  test('should fail when maxPlayers is too low', async ({ assert }) => {
    const { handler } = makeSut()

    const command = new CreateLobbyCommand('owner-1', 'Owner', 'Test Lobby', 1, 2, false, 'default')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Max players must be between')
  })

  test('should fail when maxPlayers is too high', async ({ assert }) => {
    const { handler } = makeSut()

    const command = new CreateLobbyCommand(
      'owner-1',
      'Owner',
      'Test Lobby',
      20,
      2,
      false,
      'default'
    )
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Max players must be between')
  })

  test('should fail when minPlayers is greater than maxPlayers', async ({ assert }) => {
    const { handler } = makeSut()

    const command = new CreateLobbyCommand('owner-1', 'Owner', 'Test Lobby', 4, 5, false, 'default')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Min players must be between')
  })

  test('should fail when owner name is empty (invalid player)', async ({ assert }) => {
    const { handler } = makeSut()

    const command = new CreateLobbyCommand('owner-1', '', 'Test Lobby', 4, 2, false, 'default')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Username is required')
  })

  test('should propagate repository save errors', async ({ assert }) => {
    const repository = new FailingLobbyRepository()
    const eventBus = new FakeEventBus()
    const handler = new CreateLobbyHandler(repository, eventBus)

    const command = new CreateLobbyCommand('owner-1', 'Owner', 'Test Lobby', 4, 2, false, 'default')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Persistence error')
  })
})
