import { test } from '@japa/runner'
import { CreateLobbyUseCase } from '../../app/application/use_cases/create_lobby_use_case.js'
import { JoinLobbyUseCase } from '../../app/application/use_cases/join_lobby_use_case.js'
import { LeaveLobbyUseCase } from '../../app/application/use_cases/leave_lobby_use_case.js'
import { StartGameUseCase } from '../../app/application/use_cases/start_game_use_case.js'
import { ListLobbiesUseCase } from '../../app/application/use_cases/list_lobbies_use_case.js'
import { InMemoryLobbyRepository } from '../../app/infrastructure/repositories/in_memory_lobby_repository.js'
import { InMemoryPlayerRepository } from '../../app/infrastructure/repositories/in_memory_player_repository.js'
import { InMemoryGameRepository } from '../../app/infrastructure/repositories/in_memory_game_repository.js'
import Player from '../../app/domain/entities/player.js'
import { LobbyStatus } from '../../app/domain/value_objects/lobby_status.js'

// Helper function to create a player
function createPlayer(overrides = {}) {
  const defaults = {
    userUuid: crypto.randomUUID(),
    nickName: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gamesPlayed: 0,
    gamesWon: 0,
  }
  return Player.create({ ...defaults, ...overrides })
}

test.group('Lobby Use Cases Integration', (group) => {
  let lobbyRepository: InMemoryLobbyRepository
  let playerRepository: InMemoryPlayerRepository
  let gameRepository: InMemoryGameRepository
  let createLobbyUseCase: CreateLobbyUseCase
  let joinLobbyUseCase: JoinLobbyUseCase
  let leaveLobbyUseCase: LeaveLobbyUseCase
  let startGameUseCase: StartGameUseCase
  let listLobbiesUseCase: ListLobbiesUseCase

  // Mock notification service
  const mockNotificationService = {
    notifyPlayerLeft: async () => Promise.resolve(),
    notifyPlayerJoined: async () => Promise.resolve(),
    notifyGameStarted: async () => Promise.resolve(),
  }

  // Mock event service
  const mockEventService = {
    emitLobbyDeleted: async () => Promise.resolve(),
    emitLobbyUpdated: async () => Promise.resolve(),
  }

  group.setup(() => {
    lobbyRepository = new InMemoryLobbyRepository()
    playerRepository = new InMemoryPlayerRepository()
    gameRepository = new InMemoryGameRepository()

    createLobbyUseCase = new CreateLobbyUseCase(playerRepository, lobbyRepository, null as any)
    joinLobbyUseCase = new JoinLobbyUseCase(playerRepository, lobbyRepository, null as any)
    leaveLobbyUseCase = new LeaveLobbyUseCase(
      lobbyRepository,
      mockNotificationService as any,
      mockEventService as any
    )
    startGameUseCase = new StartGameUseCase(
      lobbyRepository,
      gameRepository,
      mockNotificationService as any
    )
    listLobbiesUseCase = new ListLobbiesUseCase(lobbyRepository)
  })

  test('should handle full lobby lifecycle from creation to game start', async ({ assert }) => {
    // 1. Créer des joueurs
    const player1 = createPlayer({ nickName: 'Player1' })
    const player2 = createPlayer({ nickName: 'Player2' })
    const player3 = createPlayer({ nickName: 'Player3' })

    await playerRepository.save(player1)
    await playerRepository.save(player2)
    await playerRepository.save(player3)

    // 2. Créer un lobby privé
    const createResult = await createLobbyUseCase.execute({
      name: 'Private Lobby',
      userUuid: player1.userUuid,
      maxPlayers: 2,
      isPrivate: true,
    })

    assert.isTrue(createResult.isSuccess)
    const lobbyUuid = createResult.value.uuid

    // 3. Lister les lobbies (devrait contenir notre lobby)
    const listResult = await listLobbiesUseCase.execute({})
    assert.isTrue(listResult.isSuccess)

    // 4. Joindre le lobby avec le deuxième joueur
    const joinResult1 = await joinLobbyUseCase.execute({
      lobbyUuid,
      userUuid: player2.userUuid,
    })

    assert.isTrue(joinResult1.isSuccess)
    assert.lengthOf(joinResult1.value!.lobby.players, 2)
    assert.equal(joinResult1.value!.lobby.status, LobbyStatus.FULL)

    // 5. Tenter de joindre le lobby complet
    const joinRequest = {
      userUuid: player3.userUuid,
      lobbyUuid: lobbyUuid,
    }
    const joinResult = await joinLobbyUseCase.execute(joinRequest)

    assert.isTrue(joinResult.isFailure)
    assert.include(joinResult.error, 'full')

    // 6. Démarrer la partie
    const startResult = await startGameUseCase.execute({
      lobbyUuid,
      userUuid: player1.userUuid, // Corriger: utiliser userUuid du Player (référence vers User)
    })

    assert.isTrue(startResult.isSuccess)
    assert.exists(startResult.value!.game)
    assert.lengthOf(startResult.value!.game.players, 2)

    // 7. Vérifier que le lobby n'existe plus
    const finalListResult = await listLobbiesUseCase.execute({})
    assert.lengthOf(finalListResult.value!.lobbies, 0)

    // 8. Vérifier que la partie existe
    const savedGame = await gameRepository.findByUuid(startResult.value!.game.uuid)
    assert.exists(savedGame)
  })

  test('should handle player leaving and rejoining', async ({ assert }) => {
    // Créer des joueurs
    const player1 = createPlayer()
    const player2 = createPlayer()

    await playerRepository.save(player1)
    await playerRepository.save(player2)

    // Créer un lobby
    const createResult = await createLobbyUseCase.execute({
      name: 'Test Lobby',
      userUuid: player1.userUuid,
      maxPlayers: 4,
      isPrivate: false,
    })

    const lobbyUuid = createResult.value.uuid

    // Joindre avec le deuxième joueur
    await joinLobbyUseCase.execute({
      lobbyUuid,
      userUuid: player2.userUuid,
    })

    // Le deuxième joueur quitte
    const leaveResult = await leaveLobbyUseCase.execute({
      lobbyUuid,
      userUuid: player2.userUuid, // Corriger: utiliser userUuid (référence vers User)
    })

    assert.isTrue(leaveResult.isSuccess)
    assert.lengthOf(leaveResult.value!.lobby.players, 1)

    // Le deuxième joueur rejoint
    const rejoinResult = await joinLobbyUseCase.execute({
      lobbyUuid,
      userUuid: player2.userUuid,
    })

    assert.isTrue(rejoinResult.isSuccess)
    assert.lengthOf(rejoinResult.value!.lobby.players, 2)
  })

  test('should delete lobby when creator leaves and no other players', async ({ assert }) => {
    const player1 = createPlayer()
    await playerRepository.save(player1)

    // Créer un lobby
    const createResult = await createLobbyUseCase.execute({
      name: 'Test Lobby',
      userUuid: player1.userUuid,
      maxPlayers: 4,
      isPrivate: false,
    })

    const lobbyUuid = createResult.value.uuid

    // Le créateur quitte (seul dans le lobby)
    const leaveResult = await leaveLobbyUseCase.execute({
      lobbyUuid,
      userUuid: player1.userUuid, // Corriger: utiliser userUuid (référence vers User)
    })

    assert.isTrue(leaveResult.isSuccess)
    assert.isTrue(leaveResult.value!.lobbyDeleted)

    // Vérifier que le lobby n'existe plus
    const listResult = await listLobbiesUseCase.execute({})
    assert.lengthOf(listResult.value!.lobbies, 0)
  })

  test('should prevent non-creator from starting game', async ({ assert }) => {
    const player1 = createPlayer()
    const player2 = createPlayer()

    await playerRepository.save(player1)
    await playerRepository.save(player2)

    // Créer un lobby
    const createResult = await createLobbyUseCase.execute({
      name: 'Test Lobby',
      userUuid: player1.userUuid,
      maxPlayers: 4,
      isPrivate: false,
    })

    const lobbyUuid = createResult.value.uuid

    // Joindre avec le deuxième joueur
    await joinLobbyUseCase.execute({
      lobbyUuid,
      userUuid: player2.userUuid,
    })

    // Le deuxième joueur essaie de démarrer (ne devrait pas pouvoir)
    const startResult = await startGameUseCase.execute({
      lobbyUuid,
      userUuid: player2.userUuid,
    })

    assert.isTrue(startResult.isFailure)
    assert.equal(startResult.error, 'Only the lobby creator can start the game')
  })

  test('should handle concurrent joins correctly', async ({ assert }) => {
    const players = Array.from({ length: 5 }, () => createPlayer())

    // Sauvegarder tous les joueurs
    for (const player of players) {
      await playerRepository.save(player)
    }

    // Créer un lobby avec une capacité de 4
    const createResult = await createLobbyUseCase.execute({
      name: 'Test Lobby',
      userUuid: players[0].userUuid,
      maxPlayers: 4,
      isPrivate: false,
    })

    const lobbyUuid = createResult.value!.uuid

    // Essayer de joindre avec tous les autres joueurs
    const joinPromises = players.slice(1).map((player) =>
      joinLobbyUseCase.execute({
        lobbyUuid,
        userUuid: player.userUuid,
      })
    )

    const results = await Promise.all(joinPromises)

    // 3 devraient réussir, 1 devrait échouer (lobby plein)
    const successful = results.filter((r) => r.isSuccess)
    const failed = results.filter((r) => r.isFailure)

    assert.lengthOf(successful, 3)
    assert.lengthOf(failed, 1)
    assert.equal(failed[0].error, 'Lobby is full')

    // Vérifier l'état final du lobby
    const finalLobby = await lobbyRepository.findByUuid(lobbyUuid)
    assert.lengthOf(finalLobby!.players, 4)
    assert.equal(finalLobby!.status, LobbyStatus.FULL)
  })
})
