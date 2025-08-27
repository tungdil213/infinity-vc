import Lobby from '../../domain/entities/lobby.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import { LobbyRepository } from '../../application/repositories/lobby_repository.js'
import { EntityNotFoundError } from '../../application/repositories/base_repository.js'

export class InMemoryLobbyRepository implements LobbyRepository {
  private lobbies: Map<string, Lobby> = new Map()

  async findByUuid(uuid: string): Promise<Lobby | null> {
    return this.lobbies.get(uuid) || null
  }

  async findByUuidOrFail(uuid: string): Promise<Lobby> {
    const lobby = await this.findByUuid(uuid)
    if (!lobby) {
      throw new EntityNotFoundError('Lobby', uuid)
    }
    return lobby
  }

  async findByCreator(creatorUuid: string): Promise<Lobby[]> {
    const result: Lobby[] = []
    for (const lobby of this.lobbies.values()) {
      if (lobby.createdBy === creatorUuid) {
        result.push(lobby)
      }
    }
    return result
  }

  async findByStatus(status: LobbyStatus): Promise<Lobby[]> {
    const result: Lobby[] = []
    for (const lobby of this.lobbies.values()) {
      if (lobby.status === status) {
        result.push(lobby)
      }
    }
    return result
  }

  async findAvailableLobbies(): Promise<Lobby[]> {
    const availableStatuses = [LobbyStatus.OPEN, LobbyStatus.WAITING, LobbyStatus.READY]
    const result: Lobby[] = []

    for (const lobby of this.lobbies.values()) {
      if (availableStatuses.includes(lobby.status) && !lobby.isPrivate) {
        result.push(lobby)
      }
    }

    // Trier par date de création (plus récents en premier)
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async findByPlayer(playerUuid: string): Promise<Lobby | null> {
    console.log('findByPlayer', playerUuid)
    console.log(this.lobbies)
    for (const lobby of this.lobbies.values()) {
      if (lobby.hasPlayer(playerUuid)) {
        return lobby
      }
    }
    return null
  }

  async findActiveLobbies(): Promise<Lobby[]> {
    const activeStatuses = [
      LobbyStatus.OPEN,
      LobbyStatus.WAITING,
      LobbyStatus.READY,
      LobbyStatus.FULL,
    ]

    const result: Lobby[] = []
    for (const lobby of this.lobbies.values()) {
      if (activeStatuses.includes(lobby.status)) {
        result.push(lobby)
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async countActiveLobbies(): Promise<number> {
    const activeLobbies = await this.findActiveLobbies()
    return activeLobbies.length
  }

  async save(lobby: Lobby): Promise<void> {
    this.lobbies.set(lobby.uuid, lobby)
  }

  async delete(uuid: string): Promise<void> {
    this.lobbies.delete(uuid)
  }

  async findAll(): Promise<Lobby[]> {
    return Array.from(this.lobbies.values())
  }

  // Méthodes utilitaires pour les tests et le développement
  clear(): void {
    this.lobbies.clear()
  }

  count(): number {
    return this.lobbies.size
  }

  // Nettoyage automatique des lobbies terminés
  async cleanupFinishedLobbies(): Promise<number> {
    let cleanedCount = 0
    const toDelete: string[] = []

    for (const [uuid, lobby] of this.lobbies.entries()) {
      if (lobby.status === LobbyStatus.STARTING) {
        // Les lobbies en STARTING peuvent être supprimés après un certain temps
        const timeSinceCreation = Date.now() - lobby.createdAt.getTime()
        if (timeSinceCreation > 5 * 60 * 1000) {
          // 5 minutes
          toDelete.push(uuid)
        }
      }
    }

    for (const uuid of toDelete) {
      this.lobbies.delete(uuid)
      cleanedCount++
    }

    return cleanedCount
  }
}
