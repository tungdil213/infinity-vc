import type { QueryHandler } from '#shared_kernel/application/query.interface'
import { Result } from '#shared_kernel/domain/result'
import type { GetUserQuery } from './get_user.query.js'
import type { User } from '../../../domain/entities/user.entity.js'
import type { UserRepository } from '../../../domain/repositories/user_repository.interface.js'

export class GetUserHandler implements QueryHandler<GetUserQuery, User> {
  constructor(private readonly userRepository: UserRepository) {}

  async handle(query: GetUserQuery): Promise<Result<User>> {
    const userResult = await this.userRepository.findById(query.userId)

    if (userResult.isFailure || !userResult.value) {
      return Result.fail('User not found')
    }

    return Result.ok(userResult.value)
  }
}
