import { inject } from '@adonisjs/core'
import { User } from '../../domain/entities/user.js'
import { UserRepository } from '../../domain/repositories/user_repository.js'

@inject()
export class DatabaseUserRepository implements UserRepository {
  async save(user: User): Promise<User> {
    // For now, return the user as-is since we don't have a User model yet
    return user
  }

  async findByUuid(uuid: string): Promise<User | null> {
    // Mock implementation - in a real app, this would query the database
    // For now, create a mock user for testing
    if (uuid) {
      return new User({
        uuid: uuid,
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
      })
    }
    return null
  }

  async findByEmail(email: string): Promise<User | null> {
    // Mock implementation - in a real app, this would query the database
    if (email) {
      return new User({
        uuid: 'test-uuid',
        fullName: 'Test User',
        email: email,
        password: 'hashed_password',
      })
    }
    return null
  }

  async findAll(): Promise<User[]> {
    // Mock implementation
    return []
  }

  async delete(uuid: string): Promise<void> {
    // Mock implementation
    console.log(`Would delete user ${uuid}`)
  }
}
