import type { LobbyAggregate } from '../../domain/aggregates/lobby.aggregate.js'
import type { LobbyRepository } from '../../domain/repositories/lobby_repository.interface.js'
import { Result } from '#shared_kernel/domain/result'
import { inject } from '@adonisjs/core'

/**
 * Lobby Migration Service
 *
 * Handles migration of lobbies from InMemory to Lucid (DB) when a game starts.
 *
 * Flow:
 * 1. Lobby created → InMemory (WAITING)
 * 2. Lobby.start() called → Migrate to DB (IN_GAME)
 * 3. Game ends → Stay in DB (FINISHED) for history/stats
 */
@inject()
export class LobbyMigrationService {
  constructor(
    private readonly inMemoryRepository: LobbyRepository,
    private readonly lucidRepository: LobbyRepository
  ) {}

  /**
   * Migrate a lobby from InMemory to DB
   * Called when lobby.start() is executed
   */
  async migrateToDatabase(lobbyId: string): Promise<Result<LobbyAggregate>> {
    try {
      // 1. Export from InMemory (removes it)
      const exportResult = await this.inMemoryRepository.exportForPersistence?.(lobbyId)

      if (!exportResult || exportResult.isFailure || !exportResult.value) {
        return Result.fail('Lobby not found in memory or already migrated')
      }

      const aggregate = exportResult.value

      // 2. Save to DB
      const saveResult = await this.lucidRepository.save(aggregate)

      if (saveResult.isFailure) {
        // Rollback: put back in memory
        await this.inMemoryRepository.save(aggregate)
        return Result.fail(`Failed to migrate lobby to DB: ${saveResult.error}`)
      }

      return Result.ok(saveResult.value)
    } catch (error) {
      return Result.fail(`Migration failed: ${error.message}`)
    }
  }

  /**
   * Check if a lobby exists in memory or DB
   */
  async findLobby(identifier: string): Promise<Result<LobbyAggregate | null>> {
    // Try InMemory first (most recent lobbies)
    const memoryResult =
      (await this.inMemoryRepository.findByUuid?.(identifier)) ??
      (await this.inMemoryRepository.findById(identifier))

    if (memoryResult.isSuccess && memoryResult.value) {
      return memoryResult
    }

    // Try DB (started games)
    return (
      this.lucidRepository.findByUuid?.(identifier) ?? this.lucidRepository.findById(identifier)
    )
  }

  /**
   * Get all lobbies (from both sources)
   */
  async findAllLobbies(): Promise<Result<LobbyAggregate[]>> {
    const memoryResult = await this.inMemoryRepository.findAll()
    const dbResult = await this.lucidRepository.findAll()

    if (memoryResult.isFailure) return memoryResult
    if (dbResult.isFailure) return dbResult

    const all = [...memoryResult.value, ...dbResult.value]
    return Result.ok(all)
  }
}
