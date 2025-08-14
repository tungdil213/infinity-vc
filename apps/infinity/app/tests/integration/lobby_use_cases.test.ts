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

    createLobbyUseCase = new CreateLobbyUseCase(lobbyRepository, playerRepository)
    joinLobbyUseCase = new JoinLobbyUseCase(lobbyRepository, playerRepository)
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

      // 2. Créer un lobby
      const createResult = await createLobbyUseCase.execute({
        name: 'Test Lobby',
        creatorUuid: player1.uuid,
        maxPlayers: 4,
        isPrivate: false,
      })

      expect(createResult.success).toBe(true)
      const lobbyUuid = createResult.lobby!.uuid

      // 3. Lister les lobbies (devrait contenir notre lobby)
      const listResult = await listLobbiesUseCase.execute({})
      expect(listResult.success).toBe(true)
      expect(listResult.lobbies).toHaveLength(1)
      expect(listResult.lobbies[0].name).toBe('Test Lobby')

      // 4. Joindre le lobby avec le deuxième joueur
      const joinResult1 = await joinLobbyUseCase.execute({
        lobbyUuid,
        playerUuid: player2.uuid,
      })

      expect(joinResult1.success).toBe(true)
      expect(joinResult1.lobby!.players).toHaveLength(2)
      expect(joinResult1.lobby!.status).toBe(LobbyStatus.WAITING)

      // 5. Joindre le lobby avec le troisième joueur
      const joinResult2 = await joinLobbyUseCase.execute({
        lobbyUuid,
        playerUuid: player3.uuid,
      })

      expect(joinResult2.success).toBe(true)
      expect(joinResult2.lobby!.players).toHaveLength(3)

      // 6. Démarrer la partie
      const startResult = await startGameUseCase.execute({
        lobbyUuid,
        playerUuid: player1.uuid, // Le créateur démarre la partie
      })

      expect(startResult.success).toBe(true)
      expect(startResult.game).toBeDefined()
      expect(startResult.game!.players).toHaveLength(3)

      // 7. Vérifier que le lobby n'existe plus
      const finalListResult = await listLobbiesUseCase.execute({})
      expect(finalListResult.lobbies).toHaveLength(0)

      // 8. Vérifier que la partie existe
      const savedGame = await gameRepository.findByUuid(startResult.game!.uuid)
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
        creatorUuid: player1.uuid,
        maxPlayers: 4,
        isPrivate: false,
      })

      const lobbyUuid = createResult.lobby!.uuid

      // Joindre avec le deuxième joueur
      await joinLobbyUseCase.execute({
        lobbyUuid,
        playerUuid: player2.uuid,
      })

      // Le deuxième joueur quitte
      const leaveResult = await leaveLobbyUseCase.execute({
        lobbyUuid,
        playerUuid: player2.uuid,
      })

      expect(leaveResult.success).toBe(true)
      expect(leaveResult.lobby!.players).toHaveLength(1)

      // Le deuxième joueur rejoint
      const rejoinResult = await joinLobbyUseCase.execute({
        lobbyUuid,
        playerUuid: player2.uuid,
      })

      expect(rejoinResult.success).toBe(true)
      expect(rejoinResult.lobby!.players).toHaveLength(2)
    })

    it('should delete lobby when creator leaves and no other players', async () => {
      const player1 = PlayerFactory.create()
      await playerRepository.save(player1)

      // Créer un lobby
      const createResult = await createLobbyUseCase.execute({
        name: 'Test Lobby',
        creatorUuid: player1.uuid,
        maxPlayers: 4,
        isPrivate: false,
      })

      const lobbyUuid = createResult.lobby!.uuid

      // Le créateur quitte (seul dans le lobby)
      const leaveResult = await leaveLobbyUseCase.execute({
        lobbyUuid,
        playerUuid: player1.uuid,
      })

      expect(leaveResult.success).toBe(true)
      expect(leaveResult.lobbyDeleted).toBe(true)

      // Vérifier que le lobby n'existe plus
      const listResult = await listLobbiesUseCase.execute({})
      expect(listResult.lobbies).toHaveLength(0)
    })

    it('should prevent non-creator from starting game', async () => {
      const player1 = PlayerFactory.create()
      const player2 = PlayerFactory.create()

      await playerRepository.save(player1)
      await playerRepository.save(player2)

      // Créer un lobby
      const createResult = await createLobbyUseCase.execute({
        name: 'Test Lobby',
        creatorUuid: player1.uuid,
        maxPlayers: 4,
        isPrivate: false,
      })

      const lobbyUuid = createResult.lobby!.uuid

      // Joindre avec le deuxième joueur
      await joinLobbyUseCase.execute({
        lobbyUuid,
        playerUuid: player2.uuid,
      })

      // Le deuxième joueur essaie de démarrer (ne devrait pas pouvoir)
      const startResult = await startGameUseCase.execute({
        lobbyUuid,
        playerUuid: player2.uuid,
      })

      expect(startResult.success).toBe(false)
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
        creatorUuid: players[0].uuid,
        maxPlayers: 4,
        isPrivate: false,
      })

      const lobbyUuid = createResult.lobby!.uuid

      // Essayer de joindre avec tous les autres joueurs
      const joinPromises = players.slice(1).map((player) =>
        joinLobbyUseCase.execute({
          lobbyUuid,
          playerUuid: player.uuid,
        })
      )

      const results = await Promise.all(joinPromises)

      // 3 devraient réussir, 1 devrait échouer (lobby plein)
      const successful = results.filter((r) => r.success)
      const failed = results.filter((r) => !r.success)

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
