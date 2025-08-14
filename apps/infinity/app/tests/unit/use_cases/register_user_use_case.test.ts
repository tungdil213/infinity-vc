import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { RegisterUserUseCase } from '../../../application/use_cases/register_user_use_case.js'
import { InMemoryUserRepository } from '../../../infrastructure/repositories/in_memory_user_repository.js'
import { InMemoryPlayerRepository } from '../../../infrastructure/repositories/in_memory_player_repository.js'
import { UserFactory } from '../../factories/user_factory.js'

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase
  let userRepository: InMemoryUserRepository
  let playerRepository: InMemoryPlayerRepository

  beforeEach(() => {
    userRepository = new InMemoryUserRepository()
    playerRepository = new InMemoryPlayerRepository()
    useCase = new RegisterUserUseCase(userRepository, playerRepository)
  })

  describe('execute', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
        nickName: 'JohnnyD',
      }

      const result = await useCase.execute(userData)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.player).toBeDefined()
      expect(result.user!.email).toBe('john@example.com')
      expect(result.player!.nickName).toBe('JohnnyD')
    })

    it('should fail when email already exists', async () => {
      const existingUser = UserFactory.create({ email: 'john@example.com' })
      await userRepository.save(existingUser)

      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'john@example.com', // Same email
        password: 'password123',
        nickName: 'JaneS',
      }

      const result = await useCase.execute(userData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already exists')
    })

    it('should fail when username already exists', async () => {
      const existingUser = UserFactory.create({ username: 'johndoe' })
      await userRepository.save(existingUser)

      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'johndoe', // Same username
        email: 'jane@example.com',
        password: 'password123',
        nickName: 'JaneS',
      }

      const result = await useCase.execute(userData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Username already exists')
    })

    it('should fail with invalid user data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'jo', // Too short
        email: 'john@example.com',
        password: 'password123',
        nickName: 'JohnnyD',
      }

      const result = await useCase.execute(userData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Username must be between 3 and 50 characters')
    })

    it('should fail with invalid player data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
        nickName: 'Jo', // Too short
      }

      const result = await useCase.execute(userData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Nickname must be between 3 and 30 characters')
    })

    it('should save both user and player to repositories', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
        nickName: 'JohnnyD',
      }

      await useCase.execute(userData)

      const savedUser = await userRepository.findByEmail('john@example.com')
      const savedPlayer = await playerRepository.findByUserUuid(savedUser!.uuid)

      expect(savedUser).toBeDefined()
      expect(savedPlayer).toBeDefined()
      expect(savedPlayer!.userUuid).toBe(savedUser!.uuid)
    })

    it('should handle repository save errors', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
        nickName: 'JohnnyD',
      }

      // Mock repository to throw error
      jest.spyOn(userRepository, 'save').mockRejectedValue(new Error('Database error'))

      const result = await useCase.execute(userData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })
})
