import type { QueryHandler } from '#shared_kernel/application/query.interface'
import { Result } from '#shared_kernel/domain/result'
import type { ListLobbiesQuery } from './list_lobbies.query.js'
import type { LobbyAggregate } from '../../../domain/aggregates/lobby.aggregate.js'
import type { LobbyRepository } from '../../../domain/repositories/lobby_repository.interface.js'

export class ListLobbiesHandler implements QueryHandler<ListLobbiesQuery, LobbyAggregate[]> {
  constructor(private readonly lobbyRepository: LobbyRepository) {}

  async handle(query: ListLobbiesQuery): Promise<Result<LobbyAggregate[]>> {
    if (query.onlyAvailable) {
      return await this.lobbyRepository.findAvailable()
    }

    return await this.lobbyRepository.findAll()
  }
}
