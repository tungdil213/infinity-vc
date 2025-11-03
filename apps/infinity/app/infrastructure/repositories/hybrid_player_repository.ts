import Player from '#domain/entities/player'
import { PlayerInterface } from '#domain/interfaces/player_interface'
import { PlayerRepository } from '#application/repositories/player_repository'
import { EntityNotFoundError } from '#application/repositories/base_repository'
import { InMemoryPlayerRepository } from './in_memory_player_repository.js'
import { DatabasePlayerRepository } from './database_player_repository.js'

/**
 * Repository hybride qui cherche d'abord en mémoire puis en base de données
 * Permet de gérer les players temporaires (en mémoire) et persistants (BD)
 */
export class HybridPlayerRepository implements PlayerRepository {
  private inMemoryRepo: InMemoryPlayerRepository
  private databaseRepo: DatabasePlayerRepository

  constructor() {
    this.inMemoryRepo = new InMemoryPlayerRepository()
    this.databaseRepo = new DatabasePlayerRepository()
  }

  async findByUuid(uuid: string): Promise<Player | null> {
    // D'abord en mémoire
    const inMemoryPlayer = await this.inMemoryRepo.findByUuid(uuid)
    if (inMemoryPlayer) {
      return inMemoryPlayer
    }

    // Puis en base de données
    return this.databaseRepo.findByUuid(uuid)
  }

  async findByUuidOrFail(uuid: string): Promise<Player> {
    const player = await this.findByUuid(uuid)
    if (!player) {
      throw new EntityNotFoundError('Player', uuid)
    }
    return player
  }

  async findByUserUuid(userUuid: string): Promise<Player | null> {
    // D'abord en mémoire
    const inMemoryPlayer = await this.inMemoryRepo.findByUserUuid(userUuid)
    if (inMemoryPlayer) {
      return inMemoryPlayer
    }

    // Puis en base de données
    return this.databaseRepo.findByUserUuid(userUuid)
  }

  async findByUserUuidOrFail(userUuid: string): Promise<Player> {
    const player = await this.findByUserUuid(userUuid)
    if (!player) {
      throw new EntityNotFoundError('Player', userUuid)
    }
    return player
  }

  async findByNickName(nickName: string): Promise<Player | null> {
    // D'abord en mémoire
    const inMemoryPlayer = await this.inMemoryRepo.findByNickName(nickName)
    if (inMemoryPlayer) {
      return inMemoryPlayer
    }

    // Puis en base de données
    return this.databaseRepo.findByNickName(nickName)
  }

  async existsByNickName(nickName: string): Promise<boolean> {
    // Chercher dans les deux
    const inMemory = await this.inMemoryRepo.existsByNickName(nickName)
    if (inMemory) {
      return true
    }

    return this.databaseRepo.existsByNickName(nickName)
  }

  /**
   * 🎯 Méthode clé : cherche d'abord en mémoire, puis en BD
   * Crée automatiquement un PlayerInterface depuis User si disponible
   */
  async findPlayerInterfaceByUuid(userUuid: string): Promise<PlayerInterface | null> {
    // D'abord en mémoire
    const inMemoryPlayer = await this.inMemoryRepo.findPlayerInterfaceByUuid(userUuid)
    if (inMemoryPlayer) {
      return inMemoryPlayer
    }

    // Puis en base de données (cherche dans la table User)
    return this.databaseRepo.findPlayerInterfaceByUuid(userUuid)
  }

  async findPlayerInterfaceByUuidOrFail(userUuid: string): Promise<PlayerInterface> {
    const playerInterface = await this.findPlayerInterfaceByUuid(userUuid)
    if (!playerInterface) {
      throw new EntityNotFoundError('PlayerInterface', userUuid)
    }
    return playerInterface
  }

  /**
   * Sauvegarde uniquement en mémoire (pour les lobbies temporaires)
   */
  async save(player: Player): Promise<void> {
    return this.inMemoryRepo.save(player)
  }

  async delete(uuid: string): Promise<void> {
    // Supprimer des deux si nécessaire
    await this.inMemoryRepo.delete(uuid)
    // Note: on ne supprime pas de la BD pour éviter la perte de données
  }

  async findAll(): Promise<Player[]> {
    // Combiner les deux sources
    const inMemoryPlayers = await this.inMemoryRepo.findAll()
    const databasePlayers = await this.databaseRepo.findAll()

    // Dédupliquer par userUuid
    const playerMap = new Map<string, Player>()

    for (const player of inMemoryPlayers) {
      playerMap.set(player.userUuid, player)
    }

    for (const player of databasePlayers) {
      if (!playerMap.has(player.userUuid)) {
        playerMap.set(player.userUuid, player)
      }
    }

    return Array.from(playerMap.values())
  }

  /**
   * Méthodes utilitaires
   */
  clear(): void {
    this.inMemoryRepo.clear()
  }

  count(): number {
    return this.inMemoryRepo.count()
  }
}
