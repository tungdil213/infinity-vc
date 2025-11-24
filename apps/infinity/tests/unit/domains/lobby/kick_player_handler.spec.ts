import { test } from '@japa/runner'
import { KickPlayerHandler } from '#lobby/application/commands/kick_player/kick_player.handler'
import { KickPlayerCommand } from '#lobby/application/commands/kick_player/kick_player.command'
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

async function createLobbyWithOwnerAndTarget(): Promise<{
  aggregate: LobbyAggregate
  repository: LobbyRepositoryInMemory
  ownerId: string
  targetId: string
}> {
  const repository = new LobbyRepositoryInMemory()

  const settingsResult = LobbySettings.create({
    name: 'Test Lobby',
    maxPlayers: 4,
    minPlayers: 2,
    isPrivate: false,
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

  const ownerPlayerResult = Player.create({
    userId: 'owner-1',
    username: 'Owner',
    lobbyId: aggregate.id,
    isOwner: true,
  })

  if (ownerPlayerResult.isFailure) {
    throw new Error(ownerPlayerResult.error)
  }

  const addOwnerResult = aggregate.addPlayer(ownerPlayerResult.value)
  if (addOwnerResult.isFailure) {
    throw new Error(addOwnerResult.error)
  }

  const targetPlayerResult = Player.create({
    userId: 'user-2',
    username: 'Target',
    lobbyId: aggregate.id,
    isOwner: false,
  })

  if (targetPlayerResult.isFailure) {
    throw new Error(targetPlayerResult.error)
  }

  const addTargetResult = aggregate.addPlayer(targetPlayerResult.value)
  if (addTargetResult.isFailure) {
    throw new Error(addTargetResult.error)
  }

  const saveResult = await repository.save(aggregate)
  if (saveResult.isFailure) {
    throw new Error(saveResult.error)
  }

  return {
    aggregate,
    repository,
    ownerId: 'owner-1',
    targetId: 'user-2',
  }
}

class FailingSaveLobbyRepository extends LobbyRepositoryInMemory implements LobbyRepository {
  async save(aggregate: LobbyAggregate): Promise<Result<LobbyAggregate>> {
    await super.save(aggregate)
    return Result.fail('Persistence error')
  }
}

test.group('Lobby - KickPlayerHandler', () => {
  test('should kick player successfully when owner kicks another player', async ({ assert }) => {
    const { aggregate, repository, ownerId, targetId } = await createLobbyWithOwnerAndTarget()
    const eventBus = new FakeEventBus()
    const handler = new KickPlayerHandler(repository, eventBus)

    const command = new KickPlayerCommand(aggregate.id, ownerId, targetId)
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
    const handler = new KickPlayerHandler(repository, eventBus)

    const command = new KickPlayerCommand('non-existent-lobby', 'owner-1', 'user-2')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby not found')
  })

  test('should fail when non-owner tries to kick a player', async ({ assert }) => {
    const { aggregate, repository, targetId } = await createLobbyWithOwnerAndTarget()
    const eventBus = new FakeEventBus()
    const handler = new KickPlayerHandler(repository, eventBus)

    const command = new KickPlayerCommand(aggregate.id, targetId, 'owner-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Only the lobby owner can kick players')
  })

  test('should fail when owner tries to kick themselves', async ({ assert }) => {
    const { aggregate, repository, ownerId } = await createLobbyWithOwnerAndTarget()
    const eventBus = new FakeEventBus()
    const handler = new KickPlayerHandler(repository, eventBus)

    const command = new KickPlayerCommand(aggregate.id, ownerId, ownerId)
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'You cannot kick yourself')
  })

  test('should fail when target player is not in lobby', async ({ assert }) => {
    const { aggregate, repository, ownerId } = await createLobbyWithOwnerAndTarget()
    const eventBus = new FakeEventBus()
    const handler = new KickPlayerHandler(repository, eventBus)

    const command = new KickPlayerCommand(aggregate.id, ownerId, 'missing-user')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Player not found in lobby')
  })

  test('should propagate repository save errors', async ({ assert }) => {
    const { aggregate } = await createLobbyWithOwnerAndTarget()
    const repository = new FailingSaveLobbyRepository()
    const eventBus = new FakeEventBus()
    const handler = new KickPlayerHandler(repository, eventBus)

    // Seed failing repository with the aggregate
    await repository.save(aggregate)

    const command = new KickPlayerCommand(aggregate.id, 'owner-1', 'user-2')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Persistence error')
  })
})
