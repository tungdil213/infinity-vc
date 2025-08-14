import User from '../../domain/entities/user.js'

export class UserFactory {
  static create(
    overrides: Partial<{
      uuid: string
      firstName: string
      lastName: string
      username: string
      email: string
      password: string
      avatarUrl: string
      emailVerifiedAt: Date
    }> = {}
  ): User {
    const defaults = {
      firstName: 'John',
      lastName: 'Doe',
      username: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: 'password123',
      avatarUrl: 'https://example.com/avatar.jpg',
      emailVerifiedAt: new Date(),
    }

    return User.create({ ...defaults, ...overrides })
  }

  static createMany(count: number, overrides: any = {}): User[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        username: `user_${Date.now()}_${index}`,
        email: `user_${Date.now()}_${index}@example.com`,
      })
    )
  }
}
