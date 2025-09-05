import { test } from '@japa/runner'
import { CreateLobbyUseCase } from '../../application/use_cases/create_lobby_use_case.js'
import { JoinLobbyUseCase } from '../../application/use_cases/join_lobby_use_case.js'
import { LeaveLobbyUseCase } from '../../application/use_cases/leave_lobby_use_case.js'
import { StartGameUseCase } from '../../application/use_cases/start_game_use_case.js'
import { ListLobbiesUseCase } from '../../application/use_cases/list_lobbies_use_case.js'
import { InMemoryLobbyRepository } from '../../infrastructure/repositories/in_memory_lobby_repository.js'
import { InMemoryPlayerRepository } from '../../infrastructure/repositories/in_memory_player_repository.js'
import { InMemoryGameRepository } from '../../infrastructure/repositories/in_memory_game_repository.js'
import { PlayerFactory } from '../factories/player_factory.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import { LobbyNotificationService } from '../../application/services/lobby_notification_service.js'

test.group('Lobby Use Cases Integration', () => {
  let lobbyRepository: InMemoryLobbyRepository
  let playerRepository: InMemoryPlayerRepository
  let gameRepository: InMemoryGameRepository
  let createLobbyUseCase: CreateLobbyUseCase
  let joinLobbyUseCase: JoinLobbyUseCase
  let leaveLobbyUseCase: LeaveLobbyUseCase
  let startGameUseCase: StartGameUseCase
  let listLobbiesUseCase: ListLobbiesUseCase

  const setupRepositories = () => {
    lobbyRepository = new InMemoryLobbyRepository()
    playerRepository = new InMemoryPlayerRepository()
    gameRepository = new InMemoryGameRepository()

    // Create a real notification service instance for testing
    const notificationService = new LobbyNotificationService()

    createLobbyUseCase = new CreateLobbyUseCase(
      playerRepository,
      lobbyRepository,
      notificationService
    )
    joinLobbyUseCase = new JoinLobbyUseCase(playerRepository, lobbyRepository, notificationService)
    leaveLobbyUseCase = new LeaveLobbyUseCase(lobbyRepository)
    startGameUseCase = new StartGameUseCase(lobbyRepository, gameRepository)
    listLobbiesUseCase = new ListLobbiesUseCase(lobbyRepository)
  }

  test.group('complete lobby lifecycle', () => {
    test('should handle full lobby lifecycle from creation to game start', async ({ assert }) => {
      setupRepositories()
      // 1. Créer des joueurs
      const player1 = PlayerFactory.create({ nickName: 'Player1' })
      const player2 = PlayerFactory.create({ nickName: 'Player2' })
      const player3 = PlayerFactory.create({ nickName: 'Player3' })

      await playerRepository.save(player1)
      await playerRepository.save(player2)
      await playerRepository.save(player3)

      // Créer un lobby privé
      const createResult = await createLobbyUseCase.execute({
        name: 'Private Lobby',
        userUuid: player1.userUuid,
        maxPlayers: 2,
        isPrivate: true,
      })

      if (createResult.isFailure) {
        console.error('CreateLobby failed:', createResult.error)
      }
      assert.equal(createResult.isSuccess, true)
      const lobbyUuid = createResult.value.uuid

      // 3. Lister les lobbies (devrait contenir notre lobby)
      const listResult = await listLobbiesUseCase.execute({})
      assert.equal(listResult.isSuccess, true)

      // 4. Joindre le lobby avec le deuxième joueur
      const joinResult1 = await joinLobbyUseCase.execute({
        lobbyUuid,
        userUuid: player2.userUuid,
      })

      assert.equal(joinResult1.isSuccess, true)
      assert.lengthOf(joinResult1.value!.lobby.players, 2)
      assert.equal(joinResult1.value!.lobby.status, LobbyStatus.FULL)

      // Tenter de joindre le lobby complet
      const joinRequest = {
        userUuid: player3.userUuid,
        lobbyUuid: lobbyUuid,
      }
      const joinResult = await joinLobbyUseCase.execute(joinRequest)

      assert.equal(joinResult.isFailure, true)
      assert.include(joinResult.error, 'full')

      // 6. Démarrer la partie
      const startResult = await startGameUseCase.execute({
        lobbyUuid,
        userUuid: player1.uuid, // Utiliser l'UUID du Player, pas du User
      })

      if (startResult.isFailure) {
        console.error('StartGame failed:', startResult.error)
      }
      assert.equal(startResult.isSuccess, true)
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
      setupRepositories()
      // Créer des joueurs
      const player1 = PlayerFactory.create()
      const player2 = PlayerFactory.create()

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
        userUuid: player2.uuid, // Utiliser l'UUID du Player
      })

      assert.equal(leaveResult.isSuccess, true)
      assert.lengthOf(leaveResult.value!.lobby.players, 1)

      // Le deuxième joueur rejoint
      const rejoinResult = await joinLobbyUseCase.execute({
        lobbyUuid,
        userUuid: player2.userUuid,
      })

      assert.equal(rejoinResult.isSuccess, true)
      assert.lengthOf(rejoinResult.value!.lobby.players, 2)
    })

    test('should delete lobby when creator leaves and no other players', async ({ assert }) => {
      setupRepositories()
      const player1 = PlayerFactory.create()
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
        userUuid: player1.uuid, // Utiliser l'UUID du Player
      })

      assert.equal(leaveResult.isSuccess, true)
      assert.equal(leaveResult.value!.lobbyDeleted, true)

      // Vérifier que le lobby n'existe plus
      const listResult = await listLobbiesUseCase.execute({})
      assert.lengthOf(listResult.value!.lobbies, 0)
    })

    test('should prevent non-creator from starting game', async ({ assert }) => {
      setupRepositories()
      const player1 = PlayerFactory.create()
      const player2 = PlayerFactory.create()

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

      assert.equal(startResult.isFailure, true)
      assert.equal(startResult.error, 'Only the lobby creator can start the game')
    })

    test('should handle concurrent joins correctly', async ({ assert }) => {
      setupRepositories()
      const players = PlayerFactory.createMany(5)

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
})
