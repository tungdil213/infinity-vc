export interface BaseRepository<T> {
  findByUuid(uuid: string): Promise<T | null>
  findByUuidOrFail(uuid: string): Promise<T>
  save(entity: T): Promise<void>
  delete(uuid: string): Promise<void>
  findAll(): Promise<T[]>
}

export class EntityNotFoundError extends Error {
  constructor(entityType: string, identifier: string) {
    super(`${entityType} with identifier ${identifier} not found`)
    this.name = 'EntityNotFoundError'
  }
}
