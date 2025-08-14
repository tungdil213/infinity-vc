import User from '../../domain/entities/user.js'
import { BaseRepository } from './base_repository.js'

export interface UserRepository extends BaseRepository<User> {
  findByEmail(email: string): Promise<User | null>
  findByUsername(username: string): Promise<User | null>
  existsByEmail(email: string): Promise<boolean>
  existsByUsername(username: string): Promise<boolean>
}
