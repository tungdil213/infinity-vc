import User from '../../domain/entities/user.js'
import { UserRepository } from '../../application/repositories/user_repository.js'
import { EntityNotFoundError } from '../../application/repositories/base_repository.js'

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map()

  async findByUuid(uuid: string): Promise<User | null> {
    return this.users.get(uuid) || null
  }

  async findByUuidOrFail(uuid: string): Promise<User> {
    const user = await this.findByUuid(uuid)
    if (!user) {
      throw new EntityNotFoundError('User', uuid)
    }
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user
      }
    }
    return null
  }

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user
      }
    }
    return null
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.findByEmail(email)
    return user !== null
  }

  async existsByUsername(username: string): Promise<boolean> {
    const user = await this.findByUsername(username)
    return user !== null
  }

  async save(user: User): Promise<void> {
    this.users.set(user.uuid, user)
  }

  async delete(uuid: string): Promise<void> {
    this.users.delete(uuid)
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values())
  }

  // Méthodes utilitaires pour les tests
  clear(): void {
    this.users.clear()
  }

  count(): number {
    return this.users.size
  }
}
