import { inject } from '@adonisjs/core'
import Lobby from '../../domain/entities/lobby.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'
import { InMemoryLobbyRepository } from '../../infrastructure/repositories/in_memory_lobby_repository.js'
import { DatabaseLobbyRepository } from '../../infrastructure/repositories/database_lobby_repository.js'

/**
 * Service hybride pour la gestion des lobbies
 * - Utilise InMemoryLobbyRepository pour les lobbies non-persistés
 * - Utilise DatabaseLobbyRepository pour les lobbies persistés (parties démarrées)
 */
@inject()
export class HybridLobbyService implements LobbyRepository {
  constructor(
    private inMemoryRepository: InMemoryLobbyRepository,
    private databaseRepository: DatabaseLobbyRepository
  ) {}

  /**
   * Sauvegarde un lobby selon son statut
   * - STARTING/IN_PROGRESS: persisté en base
   * - Autres statuts: stocké en mémoire uniquement
   */
  async save(lobby: Lobby): Promise<void> {
    if (this.shouldPersist(lobby)) {
      // Persister en base ET garder en mémoire pour les requêtes temps réel
      await this.databaseRepository.save(lobby)
      await this.inMemoryRepository.save(lobby)
    } else {
      // Stockage en mémoire uniquement
      await this.inMemoryRepository.save(lobby)
    }
  }

  /**
   * Recherche un lobby par UUID dans les deux stores
   */
  async findByUuid(uuid: string): Promise<Lobby | null> {
    // Chercher d'abord en mémoire (plus rapide)
    let lobby = await this.inMemoryRepository.findByUuid(uuid)

    if (!lobby) {
      // Si pas trouvé en mémoire, chercher en base (lobbies persistés)
      lobby = await this.databaseRepository.findByUuid(uuid)

      // Si trouvé en base, le remettre en mémoire pour les futures requêtes
      if (lobby) {
        await this.inMemoryRepository.save(lobby)
      }
    }

    return lobby
  }

  async findByUuidOrFail(uuid: string): Promise<Lobby> {
    const lobby = await this.findByUuid(uuid)
    if (!lobby) {
      throw new Error(`Lobby not found: ${uuid}`)
    }
    return lobby
  }

  /**
   * Trouve tous les lobbies actifs (principalement en mémoire)
   */
  async findAll(): Promise<Lobby[]> {
    return this.inMemoryRepository.findAll()
  }

  /**
   * Trouve les lobbies par créateur (principalement en mémoire)
   */
  async findByCreator(creatorUuid: string): Promise<Lobby[]> {
    return this.inMemoryRepository.findByCreator(creatorUuid)
  }

  /**
   * Trouve les lobbies par statut (principalement en mémoire)
   */
  async findByStatus(status: LobbyStatus): Promise<Lobby[]> {
    return this.inMemoryRepository.findByStatus(status)
  }

  /**
   * Trouve les lobbies disponibles (en mémoire uniquement)
   */
  async findAvailableLobbies(): Promise<Lobby[]> {
    return this.inMemoryRepository.findAvailableLobbies()
  }

  /**
   * Trouve le lobby d'un joueur (en mémoire principalement)
   */
  async findByPlayer(playerUuid: string): Promise<Lobby | null> {
    return this.inMemoryRepository.findByPlayer(playerUuid)
  }

  /**
   * Trouve les lobbies actifs (en mémoire)
   */
  async findActiveLobbies(): Promise<Lobby[]> {
    return this.inMemoryRepository.findActiveLobbies()
  }

  /**
   * Compte les lobbies actifs (en mémoire)
   */
  async countActiveLobbies(): Promise<number> {
    return this.inMemoryRepository.countActiveLobbies()
  }

  /**
   * Supprime un lobby des deux stores
   */
  async delete(uuid: string): Promise<void> {
    // Supprimer de la mémoire
    await this.inMemoryRepository.delete(uuid)
    
    // Supprimer de la base si il y était persisté
    try {
      await this.databaseRepository.delete(uuid)
    } catch (error) {
      // Ignore si pas trouvé en base (normal pour les lobbies non-persistés)
    }
  }

  /**
   * Persiste un lobby en base (appelé lors du démarrage de partie)
   */
  async persistLobby(lobby: Lobby): Promise<void> {
    if (!this.shouldPersist(lobby)) {
      throw new Error('Lobby cannot be persisted in current state')
    }
    
    await this.databaseRepository.save(lobby)
  }

  /**
   * Détermine si un lobby doit être persisté en base
   */
  private shouldPersist(lobby: Lobby): boolean {
    return lobby.status === LobbyStatus.STARTING
  }

  /**
   * Nettoie les lobbies terminés de la mémoire
   */
  async cleanupInMemoryLobbies(): Promise<number> {
    return this.inMemoryRepository.cleanupFinishedLobbies()
  }

  /**
   * Obtient les statistiques des lobbies
   */
  async getStats(): Promise<{
    inMemory: number
    persisted: number
    total: number
  }> {
    const inMemoryCount = this.inMemoryRepository.count()
    const persistedCount = await this.databaseRepository.countActiveLobbies()

    return {
      inMemory: inMemoryCount,
      persisted: persistedCount,
      total: inMemoryCount + persistedCount,
    }
  }

  /**
   * Force la synchronisation d'un lobby vers la base
   */
  async syncToDatabase(lobbyUuid: string): Promise<void> {
    const lobby = await this.inMemoryRepository.findByUuid(lobbyUuid)
    if (lobby) {
      await this.databaseRepository.save(lobby)
    }
  }
}
