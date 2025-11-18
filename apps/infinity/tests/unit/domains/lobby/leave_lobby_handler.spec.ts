import { test } from '@japa/runner'
import { LeaveLobbyHandler } from '#lobby/application/commands/leave_lobby/leave_lobby.handler'
import { LeaveLobbyCommand } from '#lobby/application/commands/leave_lobby/leave_lobby.command'
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

async function createLobbyWithOwnerAndPlayer(): Promise<{
  aggregate: LobbyAggregate
  repository: LobbyRepositoryInMemory
  ownerId: string
  playerId: string
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

  const ownerResult = Player.create({
    userId: 'owner-1',
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

  const playerResult = Player.create({
    userId: 'user-1',
    username: 'Player 1',
    lobbyId: aggregate.id,
    isOwner: false,
  })
  if (playerResult.isFailure) {
    throw new Error(playerResult.error)
  }
  const addPlayer = aggregate.addPlayer(playerResult.value)
  if (addPlayer.isFailure) {
    throw new Error(addPlayer.error)
  }

  const saveResult = await repository.save(aggregate)
  if (saveResult.isFailure) {
    throw new Error(saveResult.error)
  }

  return {
    aggregate,
    repository,
    ownerId: 'owner-1',
    playerId: 'user-1',
  }
}

async function createLobbyWithSinglePlayer(): Promise<{
  aggregate: LobbyAggregate
  repository: LobbyRepositoryInMemory
  userId: string
}> {
  const repository = new LobbyRepositoryInMemory()

  const settingsResult = LobbySettings.create({
    name: 'Solo Lobby',
    maxPlayers: 4,
    minPlayers: 2,
    isPrivate: false,
    gameType: 'default',
  })

  if (settingsResult.isFailure) {
    throw new Error(settingsResult.error)
  }

  const lobbyResult = Lobby.create({
    ownerId: 'user-1',
    settings: settingsResult.value,
    status: LobbyStatus.WAITING,
  })

  if (lobbyResult.isFailure) {
    throw new Error(lobbyResult.error)
  }

  const aggregate = LobbyAggregate.create(lobbyResult.value)

  const playerResult = Player.create({
    userId: 'user-1',
    username: 'Solo',
    lobbyId: aggregate.id,
    isOwner: true,
  })
  if (playerResult.isFailure) {
    throw new Error(playerResult.error)
  }

  const addPlayer = aggregate.addPlayer(playerResult.value)
  if (addPlayer.isFailure) {
    throw new Error(addPlayer.error)
  }

  const saveResult = await repository.save(aggregate)
  if (saveResult.isFailure) {
    throw new Error(saveResult.error)
  }

  return {
    aggregate,
    repository,
    userId: 'user-1',
  }
}

class FailingSaveLobbyRepository extends LobbyRepositoryInMemory implements LobbyRepository {
  async save(aggregate: LobbyAggregate): Promise<Result<LobbyAggregate>> {
    await super.save(aggregate)
    return Result.fail('Persistence error')
  }
}

test.group('Lobby - LeaveLobbyHandler', () => {
  test('should remove non-owner player and keep lobby', async ({ assert }) => {
    const { aggregate, repository, playerId } = await createLobbyWithOwnerAndPlayer()
    const eventBus = new FakeEventBus()
    const handler = new LeaveLobbyHandler(repository, eventBus)

    const command = new LeaveLobbyCommand(aggregate.id, playerId)
    const result = await handler.handle(command)

    assert.isTrue(result.isSuccess)

    const storedResult = await repository.findById(aggregate.id)
    assert.isTrue(storedResult.isSuccess)
    const stored = storedResult.value
    assert.exists(stored)
    assert.equal(stored?.playersList.length, 1)
    assert.isAtLeast(eventBus.published.length, 1)
  })

  test('should delete lobby when last player leaves', async ({ assert }) => {
    const { aggregate, repository, userId } = await createLobbyWithSinglePlayer()
    const eventBus = new FakeEventBus()
    const handler = new LeaveLobbyHandler(repository, eventBus)

    const command = new LeaveLobbyCommand(aggregate.id, userId)
    const result = await handler.handle(command)

    assert.isTrue(result.isSuccess)

    const storedResult = await repository.findById(aggregate.id)
    assert.isTrue(storedResult.isSuccess)
    assert.isNull(storedResult.value)
  })

  test('should fail when lobby is not found', async ({ assert }) => {
    const repository = new LobbyRepositoryInMemory()
    const eventBus = new FakeEventBus()
    const handler = new LeaveLobbyHandler(repository, eventBus)

    const command = new LeaveLobbyCommand('non-existent-lobby', 'user-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby not found')
  })

  test('should fail when player is not in lobby', async ({ assert }) => {
    const { aggregate, repository } = await createLobbyWithOwnerAndPlayer()
    const eventBus = new FakeEventBus()
    const handler = new LeaveLobbyHandler(repository, eventBus)

    const command = new LeaveLobbyCommand(aggregate.id, 'missing-user')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Player not found in lobby')
  })

  test('should propagate save errors when lobby still has players', async ({ assert }) => {
    const { aggregate } = await createLobbyWithOwnerAndPlayer()
    const repository = new FailingSaveLobbyRepository()
    const eventBus = new FakeEventBus()
    const handler = new LeaveLobbyHandler(repository, eventBus)

    // Seed failing repository with aggregate
    await repository.save(aggregate)

    const command = new LeaveLobbyCommand(aggregate.id, 'user-1')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Persistence error')
  })
})
