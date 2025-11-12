import type { LobbyRepository } from '../../domain/repositories/lobby_repository.interface.js'
import type { LobbyAggregate } from '../../domain/aggregates/lobby.aggregate.js'
import { Result } from '#shared_kernel/domain/result'

/**
 * In-Memory Lobby Repository
 * 
 * Used for lobbies in WAITING state (not yet started).
 * Lobbies are stored in RAM and lost on server restart.
 * 
 * When a lobby starts (.start()), it should be migrated to LobbyRepositoryLucid
 * for persistence.
 * 
 * Benefits:
 * - Ultra-fast (RAM)
 * - No DB pollution
 * - Lobbies = ephemeral until game starts
 * - Crash-safe (lobbies without game = not important to persist)
 */
export class LobbyRepositoryInMemory implements LobbyRepository {
  private lobbies: Map<string, LobbyAggregate> = new Map()
  private idCounter: number = 1

  async save(aggregate: LobbyAggregate): Promise<Result<LobbyAggregate>> {
    try {
      const lobby = aggregate.lobbyEntity

      // Generate ID if new lobby (no ID yet)
      if (!lobby.id) {
        // @ts-ignore - Set private id
        lobby['_id'] = `temp_${this.idCounter++}`
      }

      // Store in memory using UUID as key
      this.lobbies.set(lobby.id, aggregate)

      return Result.ok(aggregate)
    } catch (error) {
      return Result.fail(`Failed to save lobby in memory: ${error.message}`)
    }
  }

  async findById(id: string): Promise<Result<LobbyAggregate | null>> {
    try {
      const aggregate = this.lobbies.get(id)
      return Result.ok(aggregate || null)
    } catch (error) {
      return Result.fail(`Failed to find lobby by id: ${error.message}`)
    }
  }

  async findByUuid(uuid: string): Promise<Result<LobbyAggregate | null>> {
    try {
      // Search by UUID in all lobbies
      for (const aggregate of this.lobbies.values()) {
        if (aggregate.lobbyEntity.id === uuid) {
          return Result.ok(aggregate)
        }
      }
      return Result.ok(null)
    } catch (error) {
      return Result.fail(`Failed to find lobby by uuid: ${error.message}`)
    }
  }

  async findAll(): Promise<Result<LobbyAggregate[]>> {
    try {
      const aggregates = Array.from(this.lobbies.values())
      return Result.ok(aggregates)
    } catch (error) {
      return Result.fail(`Failed to find all lobbies: ${error.message}`)
    }
  }

  async findByStatus(status: string): Promise<Result<LobbyAggregate[]>> {
    try {
      const filtered = Array.from(this.lobbies.values()).filter(
        (aggregate) => aggregate.lobbyEntity.status === status
      )
      return Result.ok(filtered)
    } catch (error) {
      return Result.fail(`Failed to find lobbies by status: ${error.message}`)
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      this.lobbies.delete(id)
      return Result.ok()
    } catch (error) {
      return Result.fail(`Failed to delete lobby: ${error.message}`)
    }
  }

  /**
   * Clear all lobbies from memory
   * Useful for testing or cleanup
   */
  clear(): void {
    this.lobbies.clear()
    this.idCounter = 1
  }

  /**
   * Get current lobby count
   */
  count(): number {
    return this.lobbies.size
  }

  async findByOwnerId(ownerId: number): Promise<Result<LobbyAggregate[]>> {
    try {
      const filtered = Array.from(this.lobbies.values()).filter(
        (aggregate) => aggregate.lobbyEntity.ownerId === ownerId
      )
      return Result.ok(filtered)
    } catch (error) {
      return Result.fail(`Failed to find lobbies by owner: ${error.message}`)
    }
  }

  async findAvailable(): Promise<Result<LobbyAggregate[]>> {
    try {
      const filtered = Array.from(this.lobbies.values()).filter((aggregate) => {
        const lobby = aggregate.lobbyEntity
        return (
          (lobby.status === 'waiting' || lobby.status === 'ready') &&
          !lobby.settings.isPrivate &&
          aggregate.playersList.length < lobby.settings.maxPlayers
        )
      })
      return Result.ok(filtered)
    } catch (error) {
      return Result.fail(`Failed to find available lobbies: ${error.message}`)
    }
  }

  async exists(id: string): Promise<boolean> {
    return this.lobbies.has(id)
  }

  async findByInvitationCode(code: string): Promise<Result<LobbyAggregate | null>> {
    try {
      for (const aggregate of this.lobbies.values()) {
        if (aggregate.lobbyEntity.invitationCode === code) {
          return Result.ok(aggregate)
        }
      }
      return Result.ok(null)
    } catch (error) {
      return Result.fail(`Failed to find lobby by invitation code: ${error.message}`)
    }
  }

  /**
   * Export lobby for migration to DB
   * Used when lobby.start() is called
   */
  async exportForPersistence(id: string): Promise<Result<LobbyAggregate | null>> {
    const result = await this.findById(id)
    if (result.isSuccess && result.value) {
      // Remove from memory (will be in DB now)
      await this.delete(id)
    }
    return result
  }
}
