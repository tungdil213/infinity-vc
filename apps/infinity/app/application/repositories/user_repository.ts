import type User from '#domain/entities/user'
import { type BaseRepository } from '#application/repositories/base_repository'

export interface UserRepository extends BaseRepository<User> {
  findByEmail(email: string): Promise<User | null>
  findByUsername(username: string): Promise<User | null>
  existsByEmail(email: string): Promise<boolean>
  existsByUsername(username: string): Promise<boolean>
}
