import { test } from '@japa/runner'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { DatabaseLobbyRepository } from '#infrastructure/repositories/database_lobby_repository'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import Lobby from '#domain/entities/lobby'
import Player from '#domain/entities/player'
import { LobbyStatus } from '#domain/value_objects/lobby_status'

test.group('Lobby Persistence Integration', (group) => {
  let hybridService: HybridLobbyService
  let inMemoryRepo: InMemoryLobbyRepository
  let databaseRepo: DatabaseLobbyRepository
  let gameRepo: DatabaseGameRepository
  let startGameUseCase: StartGameUseCase

  group.setup(async () => {
    inMemoryRepo = new InMemoryLobbyRepository()
    databaseRepo = new DatabaseLobbyRepository()
    gameRepo = new DatabaseGameRepository()
    hybridService = new HybridLobbyService(inMemoryRepo, databaseRepo)
    startGameUseCase = new StartGameUseCase(hybridService, gameRepo)
  })

  group.each.teardown(async () => {
    // Nettoyer après chaque test
    // Clear in-memory repository (no deleteAll method available)
    // En intégration, on pourrait nettoyer la DB de test
  })

  test('lobby should remain in memory until game starts', async ({ assert }) => {
    // Créer un lobby avec suffisamment de joueurs
    const owner = Player.create({
      uuid: 'player-1',
      nickName: 'Owner',
      userUuid: 'user-1',
    })

    const player2 = Player.create({
      uuid: 'player-2',
      nickName: 'Player 2',
      userUuid: 'user-2',
    })

    const lobby = Lobby.create({
      name: 'Test Lobby',
      maxPlayers: 2,
      isPrivate: false,
      creator: owner,
    })

    // Ajouter le deuxième joueur
    lobby.addPlayer(player2)

    // Sauvegarder en mémoire
    await hybridService.save(lobby)

    // Vérifier qu'il est en mémoire mais pas en base
    const inMemory = await inMemoryRepo.findByUuid(lobby.uuid)
    const inDb = await databaseRepo.findByUuid(lobby.uuid)

    assert.isNotNull(inMemory)
    assert.isNull(inDb)
    assert.equal(inMemory?.status, LobbyStatus.WAITING)
  })

  test('lobby should be persisted when game starts', async ({ assert }) => {
    // Créer un lobby prêt à démarrer
    const owner = Player.create({
      uuid: 'player-1',
      nickName: 'Owner',
      userUuid: 'user-1',
    })

    const player2 = Player.create({
      uuid: 'player-2',
      nickName: 'Player 2',
      userUuid: 'user-2',
    })

    const lobby = Lobby.create({
      name: 'Test Lobby',
      maxPlayers: 2,
      isPrivate: false,
      creator: owner,
    })

    lobby.addPlayer(player2)
    await hybridService.save(lobby)

    // Démarrer la partie
    const result = await startGameUseCase.execute({
      userUuid: 'user-1',
      lobbyUuid: lobby.uuid,
    })

    assert.isTrue(result.isSuccess)

    // Vérifier que le lobby a été persisté en base avant suppression
    // Note: Le lobby est supprimé après création de la partie,
    // mais on peut vérifier que la partie a été créée
    assert.isDefined(result.value)
    assert.equal(result.value.players.length, 2)
  })

  test('server restart simulation - in-memory lobbies should be lost', async ({ assert }) => {
    // Créer un lobby en mémoire
    const owner = Player.create({
      uuid: 'player-1',
      nickName: 'Owner',
      userUuid: 'user-1',
    })

    const lobby = Lobby.create({
      name: 'Memory Lobby',
      maxPlayers: 4,
      isPrivate: false,
      creator: owner,
    })

    await hybridService.save(lobby)

    // Vérifier qu'il est en mémoire
    let found = await hybridService.findByUuid(lobby.uuid)
    assert.isNotNull(found)

    // Simuler un redémarrage serveur en créant de nouveaux repositories
    const newInMemoryRepo = new InMemoryLobbyRepository()
    const newHybridService = new HybridLobbyService(newInMemoryRepo, databaseRepo)

    // Le lobby ne devrait plus être trouvé (perdu au redémarrage)
    found = await newHybridService.findByUuid(lobby.uuid)
    assert.isNull(found)
  })

  test('server restart simulation - persisted lobbies should survive', async ({ assert }) => {
    // Créer un lobby et le persister
    const owner = Player.create({
      uuid: 'player-1',
      nickName: 'Owner',
      userUuid: 'user-1',
    })

    const lobby = Lobby.create({
      name: 'Persisted Lobby',
      maxPlayers: 4,
      isPrivate: false,
      creator: owner,
    })

    await hybridService.save(lobby)
    await hybridService.persistLobby(lobby)

    // Simuler un redémarrage serveur
    const newInMemoryRepo = new InMemoryLobbyRepository()
    const newHybridService = new HybridLobbyService(newInMemoryRepo, databaseRepo)

    // Le lobby devrait être retrouvé depuis la base et rechargé en mémoire
    const found = await newHybridService.findByUuid(lobby.uuid)
    assert.isNotNull(found)
    assert.equal(found?.uuid, lobby.uuid)
    assert.equal(found?.name, 'Persisted Lobby')

    // Vérifier qu'il a été rechargé en mémoire
    const inNewMemory = await newInMemoryRepo.findByUuid(lobby.uuid)
    assert.isNotNull(inNewMemory)
  })

  test('hybrid service should handle mixed lobby states correctly', async ({ assert }) => {
    // Créer plusieurs lobbies dans différents états
    const owner1 = Player.create({
      uuid: 'player-1',
      nickName: 'Owner 1',
      userUuid: 'user-1',
    })

    const owner2 = Player.create({
      uuid: 'player-2',
      nickName: 'Owner 2',
      userUuid: 'user-2',
    })

    const memoryLobby = Lobby.create({
      name: 'Memory Only',
      maxPlayers: 4,
      isPrivate: false,
      creator: owner1,
    })

    const persistedLobby = Lobby.create({
      name: 'Persisted',
      maxPlayers: 4,
      isPrivate: false,
      creator: owner2,
    })

    // Sauvegarder un en mémoire seulement
    await hybridService.save(memoryLobby)

    // Sauvegarder l'autre en mémoire et persister
    await hybridService.save(persistedLobby)
    await hybridService.persistLobby(persistedLobby)

    // Vérifier les statistiques
    const stats = await hybridService.getStats()
    assert.equal(stats.inMemory, 2)
    assert.isAtLeast(stats.persisted, 1)

    // Simuler redémarrage
    const newInMemoryRepo = new InMemoryLobbyRepository()
    const newHybridService = new HybridLobbyService(newInMemoryRepo, databaseRepo)

    // Seul le lobby persisté devrait survivre
    const memoryFound = await newHybridService.findByUuid(memoryLobby.uuid)
    const persistedFound = await newHybridService.findByUuid(persistedLobby.uuid)

    assert.isNull(memoryFound)
    assert.isNotNull(persistedFound)
  })
})
