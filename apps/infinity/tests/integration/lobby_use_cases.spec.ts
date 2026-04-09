import { test } from '@japa/runner'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'
import { InMemoryLobbyRepository } from '#infrastructure/repositories/in_memory_lobby_repository'
import { InMemoryPlayerRepository } from '#infrastructure/repositories/in_memory_player_repository'
import { InMemoryGameRepository } from '#infrastructure/repositories/in_memory_game_repository'
import Player from '#domain/entities/player'
import { LobbyStatus } from '#domain/value_objects/lobby_status'
import { gameEngineService } from '#application/services/game_engine_service'
import { RpsActionTypes } from '@infinity.dev/game-engine'

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
    notifyLobbyCreated: async () => Promise.resolve(),
    notifyPlayerLeft: async () => Promise.resolve(),
    notifyPlayerJoined: async () => Promise.resolve(),
    notifyGameStarted: async () => Promise.resolve(),
  }

  // Mock event service
  const mockEventService = {
    emitLobbyDeleted: async () => Promise.resolve(),
    emitLobbyUpdated: async () => Promise.resolve(),
  }

  group.each.setup(() => {
    lobbyRepository = new InMemoryLobbyRepository()
    playerRepository = new InMemoryPlayerRepository()
    gameRepository = new InMemoryGameRepository()

    createLobbyUseCase = new CreateLobbyUseCase(
      playerRepository,
      lobbyRepository,
      mockNotificationService as any
    )
    joinLobbyUseCase = new JoinLobbyUseCase(
      playerRepository,
      lobbyRepository,
      mockNotificationService as any
    )
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
      gameType: 'rock-paper-scissors',
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
    assert.equal(joinResult1.value!.lobby.status, LobbyStatus.READY)

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

  test('should play a full rock-paper-scissors match and resolve winner', async ({ assert }) => {
    const player1 = createPlayer({ nickName: 'RPS_Player_1' })
    const player2 = createPlayer({ nickName: 'RPS_Player_2' })

    await playerRepository.save(player1)
    await playerRepository.save(player2)

    const createResult = await createLobbyUseCase.execute({
      name: 'RPS Match',
      userUuid: player1.userUuid,
      maxPlayers: 2,
      isPrivate: false,
      gameType: 'rock-paper-scissors',
      gameSettings: {
        roundsToWin: 1,
        allowDrawReplay: true,
      },
    })

    assert.isTrue(createResult.isSuccess)
    const lobbyUuid = createResult.value.uuid

    const joinResult = await joinLobbyUseCase.execute({
      lobbyUuid,
      userUuid: player2.userUuid,
    })
    assert.isTrue(joinResult.isSuccess)

    const startResult = await startGameUseCase.execute({
      lobbyUuid,
      userUuid: player1.userUuid,
    })
    assert.isTrue(startResult.isSuccess)

    const gameUuid = startResult.value!.game.uuid
    const session = gameEngineService.getSession(gameUuid)
    assert.exists(session)

    const firstMoveResult = gameEngineService.executeAction({
      gameId: gameUuid,
      playerId: player1.userUuid,
      actionType: RpsActionTypes.SUBMIT_MOVE,
      payload: { move: 'rock' },
    })
    assert.isTrue(firstMoveResult.success)

    const secondMoveResult = gameEngineService.executeAction({
      gameId: gameUuid,
      playerId: player2.userUuid,
      actionType: RpsActionTypes.SUBMIT_MOVE,
      payload: { move: 'scissors' },
    })

    assert.isTrue(secondMoveResult.success)
    assert.isTrue(secondMoveResult.newState?.isFinished ?? false)
    assert.equal(secondMoveResult.newState?.winnerId, player1.userUuid)

    gameEngineService.endGame(gameUuid)
  })

  test('should start a Love Letter Infinity Gauntlet session with hidden player views', async ({
    assert,
  }) => {
    const player1 = createPlayer({ nickName: 'LL_Player_1' })
    const player2 = createPlayer({ nickName: 'LL_Player_2' })

    await playerRepository.save(player1)
    await playerRepository.save(player2)

    const createResult = await createLobbyUseCase.execute({
      name: 'Love Letter Infinity Match',
      userUuid: player1.userUuid,
      maxPlayers: 2,
      isPrivate: false,
      gameType: 'love-letter-infinity-gauntlet',
    })

    assert.isTrue(createResult.isSuccess)
    const lobbyUuid = createResult.value.uuid

    const joinResult = await joinLobbyUseCase.execute({
      lobbyUuid,
      userUuid: player2.userUuid,
    })
    assert.isTrue(joinResult.isSuccess)

    const startResult = await startGameUseCase.execute({
      lobbyUuid,
      userUuid: player1.userUuid,
    })
    assert.isTrue(startResult.isSuccess)

    const gameUuid = startResult.value!.game.uuid
    const session = gameEngineService.getSession(gameUuid)
    assert.exists(session)
    assert.equal(session!.gameType, 'love-letter-infinity-gauntlet')

    const currentPlayerId = session!.state.currentPlayerId
    const opponentId = session!.players.find((player) => player.id !== currentPlayerId)?.id
    const currentPlayerView = gameEngineService.getPlayerView(gameUuid, currentPlayerId!)
    const rawPlayers = Array.isArray(currentPlayerView?.state.players)
      ? (currentPlayerView?.state.players as unknown as Array<Record<string, unknown>>)
      : []

    assert.deepEqual(gameEngineService.getAvailableActions(gameUuid, currentPlayerId!), [
      'draw_card',
    ])
    assert.equal(
      (rawPlayers.find((player) => player.id === currentPlayerId)?.hand as unknown[] | undefined)
        ?.length ?? 0,
      1
    )
    assert.equal(
      (rawPlayers.find((player) => player.id === opponentId)?.hand as unknown[] | undefined)
        ?.length ?? 0,
      0
    )

    gameEngineService.endGame(gameUuid)
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
      gameType: 'love-letter',
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
      gameType: 'love-letter',
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
      gameType: 'love-letter',
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
      gameType: 'love-letter',
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
    const successful = results.filter((r: { isSuccess: boolean }) => r.isSuccess)
    const failed = results.filter((r: { isFailure: boolean; error?: string }) => r.isFailure)

    assert.lengthOf(successful, 3)
    assert.lengthOf(failed, 1)
    assert.equal(failed[0].error, 'Lobby is full')

    // Vérifier l'état final du lobby
    const finalLobby = await lobbyRepository.findByUuid(lobbyUuid)
    assert.lengthOf(finalLobby!.players, 4)
    assert.equal(finalLobby!.status, LobbyStatus.FULL)
  })
})
