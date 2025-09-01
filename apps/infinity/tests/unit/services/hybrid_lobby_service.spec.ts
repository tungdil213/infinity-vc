import { test } from '@japa/runner'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import Lobby from '#domain/entities/lobby'
import Player from '#domain/entities/player'

test.group('HybridLobbyService', (group) => {
  let hybridService: HybridLobbyService
  let inMemoryRepo: InMemoryLobbyRepository
  let databaseRepo: DatabaseLobbyRepository
  let testLobby: Lobby

  group.setup(() => {
    inMemoryRepo = new InMemoryLobbyRepository()
    databaseRepo = new DatabaseLobbyRepository()
    hybridService = new HybridLobbyService(inMemoryRepo, databaseRepo)
  })

  group.each.setup(() => {
    // Créer un lobby de test
    const owner = Player.create({
      uuid: 'player-1',
      nickName: 'Test Player',
      userUuid: 'user-1',
    })

    testLobby = Lobby.create({
      name: 'Test Lobby',
      maxPlayers: 4,
      isPrivate: false,
      creator: owner,
    })
  })

  group.each.teardown(async () => {
    // Nettoyer les repositories après chaque test
    // Clear repository (no deleteAll method available)
    // Note: En test unitaire, on ne nettoie pas la DB réelle
  })

  test('should save lobby in memory by default', async ({ assert }) => {
    await hybridService.save(testLobby)

    const foundInMemory = await inMemoryRepo.findByUuid(testLobby.uuid)
    assert.isNotNull(foundInMemory)
    assert.equal(foundInMemory?.uuid, testLobby.uuid)
  })

  test('should find lobby from memory first', async ({ assert }) => {
    await inMemoryRepo.save(testLobby)

    const found = await hybridService.findByUuid(testLobby.uuid)
    assert.isNotNull(found)
    assert.equal(found?.uuid, testLobby.uuid)
  })

  test('should persist lobby to database when requested', async ({ assert }) => {
    await hybridService.save(testLobby)
    await hybridService.persistLobby(testLobby)

    // Le lobby devrait maintenant être en base
    const foundInDb = await databaseRepo.findByUuid(testLobby.uuid)
    assert.isNotNull(foundInDb)
    assert.equal(foundInDb?.uuid, testLobby.uuid)
  })

  test('should load persisted lobby back to memory when accessed', async ({ assert }) => {
    // Sauvegarder directement en base (simule un lobby persisté)
    await databaseRepo.save(testLobby)

    // Accéder via le service hybride
    const found = await hybridService.findByUuid(testLobby.uuid)
    assert.isNotNull(found)

    // Vérifier qu'il est maintenant aussi en mémoire
    const foundInMemory = await inMemoryRepo.findByUuid(testLobby.uuid)
    assert.isNotNull(foundInMemory)
  })

  test('should delete from both stores', async ({ assert }) => {
    await hybridService.save(testLobby)
    await hybridService.persistLobby(testLobby)

    await hybridService.delete(testLobby.uuid)

    const foundInMemory = await inMemoryRepo.findByUuid(testLobby.uuid)
    const foundInDb = await databaseRepo.findByUuid(testLobby.uuid)

    assert.isNull(foundInMemory)
    assert.isNull(foundInDb)
  })

  test('should provide accurate stats', async ({ assert }) => {
    // Ajouter un lobby en mémoire seulement
    await inMemoryRepo.save(testLobby)

    // Créer un autre lobby et le persister
    const owner2 = Player.create({
      uuid: 'player-2',
      nickName: 'Test Player 2',
      userUuid: 'user-2',
    })
    const persistedLobby = Lobby.create({
      name: 'Persisted Lobby',
      maxPlayers: 4,
      isPrivate: false,
      creator: owner2,
    })
    await databaseRepo.save(persistedLobby)

    const stats = await hybridService.getStats()

    assert.equal(stats.inMemory, 1)
    assert.isAtLeast(stats.persisted, 1)
    assert.isAtLeast(stats.total, 2)
  })

  test('should handle lobby not found gracefully', async ({ assert }) => {
    const found = await hybridService.findByUuid('non-existent-uuid')
    assert.isNull(found)
  })

  test('should throw error when findByUuidOrFail cannot find lobby', async ({ assert }) => {
    await assert.rejects(
      () => hybridService.findByUuidOrFail('non-existent-uuid'),
      'Lobby not found: non-existent-uuid'
    )
  })
})
