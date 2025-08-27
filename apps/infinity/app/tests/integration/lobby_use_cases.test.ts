import { describe, it, expect, beforeEach } from '@jest/globals'
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

describe('Lobby Use Cases Integration', () => {
  let lobbyRepository: InMemoryLobbyRepository
  let playerRepository: InMemoryPlayerRepository
  let gameRepository: InMemoryGameRepository
  let createLobbyUseCase: CreateLobbyUseCase
  let joinLobbyUseCase: JoinLobbyUseCase
  let leaveLobbyUseCase: LeaveLobbyUseCase
  let startGameUseCase: StartGameUseCase
  let listLobbiesUseCase: ListLobbiesUseCase

  beforeEach(() => {
    lobbyRepository = new InMemoryLobbyRepository()
    playerRepository = new InMemoryPlayerRepository()
    gameRepository = new InMemoryGameRepository()

    createLobbyUseCase = new CreateLobbyUseCase(playerRepository, lobbyRepository)
    joinLobbyUseCase = new JoinLobbyUseCase(playerRepository, lobbyRepository)
    leaveLobbyUseCase = new LeaveLobbyUseCase(lobbyRepository)
    startGameUseCase = new StartGameUseCase(lobbyRepository, gameRepository)
    listLobbiesUseCase = new ListLobbiesUseCase(lobbyRepository)
  })

  describe('complete lobby lifecycle', () => {
    it('should handle full lobby lifecycle from creation to game start', async () => {
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
      expect(createResult.isSuccess).toBe(true)
      const lobbyUuid = createResult.value.uuid

      // 3. Lister les lobbies (devrait contenir notre lobby)
      const listResult = await listLobbiesUseCase.execute({})
      expect(listResult.isSuccess).toBe(true)

      // 4. Joindre le lobby avec le deuxième joueur
      const joinResult1 = await joinLobbyUseCase.execute({
        lobbyUuid,
        userUuid: player2.userUuid,
      })

      expect(joinResult1.isSuccess).toBe(true)
      expect(joinResult1.value!.lobby.players).toHaveLength(2)
      expect(joinResult1.value!.lobby.status).toBe(LobbyStatus.FULL)

      // Tenter de joindre le lobby complet
      const joinRequest = {
        userUuid: player3.userUuid,
        lobbyUuid: lobbyUuid,
      }
      const joinResult = await joinLobbyUseCase.execute(joinRequest)

      expect(joinResult.isFailure).toBe(true)
      expect(joinResult.error).toContain('full')

      // 6. Démarrer la partie
      const startResult = await startGameUseCase.execute({
        lobbyUuid,
        userUuid: player1.uuid, // Utiliser l'UUID du Player, pas du User
      })

      if (startResult.isFailure) {
        console.error('StartGame failed:', startResult.error)
      }
      expect(startResult.isSuccess).toBe(true)
      expect(startResult.value!.game).toBeDefined()
      expect(startResult.value!.game.players).toHaveLength(2)

      // 7. Vérifier que le lobby n'existe plus
      const finalListResult = await listLobbiesUseCase.execute({})
      expect(finalListResult.value!.lobbies).toHaveLength(0)

      // 8. Vérifier que la partie existe
      const savedGame = await gameRepository.findByUuid(startResult.value!.game.uuid)
      expect(savedGame).toBeDefined()
    })

    it('should handle player leaving and rejoining', async () => {
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

      expect(leaveResult.isSuccess).toBe(true)
      expect(leaveResult.value!.lobby.players).toHaveLength(1)

      // Le deuxième joueur rejoint
      const rejoinResult = await joinLobbyUseCase.execute({
        lobbyUuid,
        userUuid: player2.userUuid,
      })

      expect(rejoinResult.isSuccess).toBe(true)
      expect(rejoinResult.value!.lobby.players).toHaveLength(2)
    })

    it('should delete lobby when creator leaves and no other players', async () => {
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

      expect(leaveResult.isSuccess).toBe(true)
      expect(leaveResult.value!.lobbyDeleted).toBe(true)

      // Vérifier que le lobby n'existe plus
      const listResult = await listLobbiesUseCase.execute({})
      expect(listResult.value!.lobbies).toHaveLength(0)
    })

    it('should prevent non-creator from starting game', async () => {
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

      expect(startResult.isFailure).toBe(true)
      expect(startResult.error).toBe('Only the lobby creator can start the game')
    })

    it('should handle concurrent joins correctly', async () => {
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

      expect(successful).toHaveLength(3)
      expect(failed).toHaveLength(1)
      expect(failed[0].error).toBe('Lobby is full')

      // Vérifier l'état final du lobby
      const finalLobby = await lobbyRepository.findByUuid(lobbyUuid)
      expect(finalLobby!.players).toHaveLength(4)
      expect(finalLobby!.status).toBe(LobbyStatus.FULL)
    })
  })
})
