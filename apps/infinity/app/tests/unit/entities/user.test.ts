import { describe, it, expect, beforeEach } from '@jest/globals'
import User from '../../../domain/entities/user.js'
import { UserFactory } from '../../factories/user_factory.js'

describe('User Entity', () => {
  describe('creation', () => {
    it('should create a user with valid data', () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
      }

      const user = User.create(userData)

      expect(user.firstName).toBe('John')
      expect(user.lastName).toBe('Doe')
      expect(user.fullName).toBe('John Doe')
      expect(user.username).toBe('johndoe')
      expect(user.email).toBe('john@example.com')
      expect(user.password).toBe('password123')
      expect(user.uuid).toBeDefined()
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.isEmailVerified).toBe(false)
    })

    it('should generate a UUID when not provided', () => {
      const user = UserFactory.create()
      expect(user.uuid).toBeDefined()
      expect(typeof user.uuid).toBe('string')
    })

    it('should use provided UUID when given', () => {
      const customUuid = crypto.randomUUID()
      const user = User.create({
        uuid: customUuid,
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
      })

      expect(user.uuid).toBe(customUuid)
    })

    it('should normalize email to lowercase', () => {
      const user = User.create({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'password123',
      })

      expect(user.email).toBe('john@example.com')
    })

    it('should trim whitespace from names and username', () => {
      const user = User.create({
        firstName: '  John  ',
        lastName: '  Doe  ',
        username: '  johndoe  ',
        email: 'john@example.com',
        password: 'password123',
      })

      expect(user.firstName).toBe('John')
      expect(user.lastName).toBe('Doe')
      expect(user.username).toBe('johndoe')
    })
  })

  describe('validation', () => {
    it('should throw error for invalid email format', () => {
      expect(() => {
        User.create({
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          email: 'invalid-email',
          password: 'password123',
        })
      }).toThrow(
        'Domain validation failed for email with value "invalid-email": must be a valid email format'
      )
    })

    it('should throw error for short username', () => {
      expect(() => {
        User.create({
          firstName: 'John',
          lastName: 'Doe',
          username: 'jo',
          email: 'john@example.com',
          password: 'password123',
        })
      }).toThrow(
        'Domain validation failed for username with value "jo": must be between 3 and 50 characters'
      )
    })

    it('should throw error for username with invalid characters', () => {
      expect(() => {
        User.create({
          firstName: 'John',
          lastName: 'Doe',
          username: 'john@doe',
          email: 'john@example.com',
          password: 'password123',
        })
      }).toThrow(
        'Domain validation failed for username with value "john@doe": can only contain letters, numbers, underscores and hyphens'
      )
    })

    it('should throw error for short password', () => {
      expect(() => {
        User.create({
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          email: 'john@example.com',
          password: '123',
        })
      }).toThrow(
        'Domain validation failed for password with value "[REDACTED]": must be at least 8 characters long'
      )
    })
  })

  describe('methods', () => {
    let user: User

    beforeEach(() => {
      user = UserFactory.create()
    })

    it('should update profile information', () => {
      user.updateProfile('Jane', 'Smith', 'https://example.com/new-avatar.jpg')

      expect(user.firstName).toBe('Jane')
      expect(user.lastName).toBe('Smith')
      expect(user.fullName).toBe('Jane Smith')
      expect(user.avatarUrl).toBe('https://example.com/new-avatar.jpg')
    })

    it('should update only provided profile fields', () => {
      const originalFirstName = user.firstName
      // const originalLastName = user.lastName

      user.updateProfile(undefined, 'NewLastName')

      expect(user.firstName).toBe(originalFirstName)
      expect(user.lastName).toBe('NewLastName')
    })

    it('should change password with valid new password', () => {
      const newPassword = 'newpassword123'
      user.changePassword(newPassword)

      expect(user.password).toBe(newPassword)
    })

    it('should throw error when changing to invalid password', () => {
      expect(() => {
        user.changePassword('123')
      }).toThrow(
        'Domain validation failed for password with value "[REDACTED]": must be at least 8 characters long'
      )
    })

    it('should verify email', () => {
      expect(user.isEmailVerified).toBe(false)

      user.verifyEmail()

      expect(user.isEmailVerified).toBe(true)
      expect(user.emailVerifiedAt).toBeInstanceOf(Date)
    })
  })

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const user = UserFactory.create({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
      })

      const json = user.toJSON()

      expect(json).toEqual({
        uuid: user.uuid,
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        avatarUrl: user.avatarUrl,
        emailVerifiedAt: user.emailVerifiedAt,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      })
    })

    it('should not include password in JSON', () => {
      const user = UserFactory.create()
      const json = user.toJSON()

      expect(json).not.toHaveProperty('password')
    })
  })
})
