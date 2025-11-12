import type { Repository } from '#shared_kernel/domain/types/repository.interface'
import type { Result } from '#shared_kernel/domain/result'
import type { User } from '../entities/user.entity.js'
import type { Email } from '../value_objects/email.vo.js'
import type { Username } from '../value_objects/username.vo.js'

export interface UserRepository extends Repository<User> {
  findByEmail(email: Email): Promise<Result<User | null>>
  findByUsername(username: Username): Promise<Result<User | null>>
  findAll(): Promise<Result<User[]>>
}
