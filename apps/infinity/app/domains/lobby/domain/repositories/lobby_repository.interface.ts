import type { Repository } from '#shared_kernel/domain/types/repository.interface'
import type { Result } from '#shared_kernel/domain/result'
import type { LobbyAggregate } from '../aggregates/lobby.aggregate.js'

export interface LobbyRepository extends Repository<LobbyAggregate> {
  findAll(): Promise<Result<LobbyAggregate[]>>
  findByOwnerId(ownerId: number): Promise<Result<LobbyAggregate[]>>
  findAvailable(): Promise<Result<LobbyAggregate[]>>
  findByInvitationCode(code: string): Promise<Result<LobbyAggregate | null>>
  exportForPersistence?(id: string): Promise<Result<LobbyAggregate | null>>
}
