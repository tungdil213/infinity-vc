import { test } from '@japa/runner'
import User from '../../../app/domain/entities/user.js'

test.group('User Entity', () => {
  test('should create a user with valid data', ({ assert }) => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    }

    const user = User.create(userData)

    assert.equal(user.firstName, 'John')
    assert.equal(user.lastName, 'Doe')
    assert.equal(user.fullName, 'John Doe')
    assert.equal(user.username, 'johndoe')
    assert.equal(user.email, 'john@example.com')
    assert.equal(user.password, 'password123')
    assert.exists(user.uuid)
    assert.instanceOf(user.createdAt, Date)
    assert.equal(user.isEmailVerified, false)
  })

  test('should generate a UUID when not provided', ({ assert }) => {
    const user = User.create({
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'jane@example.com',
      password: 'password123',
    })
    assert.exists(user.uuid)
    assert.equal(typeof user.uuid, 'string')
  })

  test('should use provided UUID when given', ({ assert }) => {
    const customUuid = crypto.randomUUID()
    const user = User.create({
      uuid: customUuid,
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    })

    assert.equal(user.uuid, customUuid)
  })

  test('should normalize email to lowercase', ({ assert }) => {
    const user = User.create({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'JOHN@EXAMPLE.COM',
      password: 'password123',
    })

    assert.equal(user.email, 'john@example.com')
  })

  test('should trim whitespace from names and username', ({ assert }) => {
    const user = User.create({
      firstName: '  John  ',
      lastName: '  Doe  ',
      username: '  johndoe  ',
      email: 'john@example.com',
      password: 'password123',
    })

    assert.equal(user.firstName, 'John')
    assert.equal(user.lastName, 'Doe')
    assert.equal(user.username, 'johndoe')
  })

  test('should throw error for invalid email format', ({ assert }) => {
    assert.throws(() => {
      User.create({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'invalid-email',
        password: 'password123',
      })
    }, 'Domain validation failed for email with value "invalid-email": must be a valid email format')
  })

  test('should throw error for short username', ({ assert }) => {
    assert.throws(() => {
      User.create({
        firstName: 'John',
        lastName: 'Doe',
        username: 'jo',
        email: 'john@example.com',
        password: 'password123',
      })
    }, 'Domain validation failed for username with value "jo": must be between 3 and 50 characters')
  })

  test('should throw error for username with invalid characters', ({ assert }) => {
    assert.throws(() => {
      User.create({
        firstName: 'John',
        lastName: 'Doe',
        username: 'john@doe',
        email: 'john@example.com',
        password: 'password123',
      })
    }, 'Domain validation failed for username with value "john@doe": can only contain letters, numbers, underscores and hyphens')
  })

  test('should throw error for short password', ({ assert }) => {
    assert.throws(() => {
      User.create({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: '123',
      })
    }, 'Domain validation failed for password with value "[REDACTED]": must be at least 8 characters long')
  })

  test('should update profile information', ({ assert }) => {
    const user = User.create({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    })
    
    user.updateProfile('Jane', 'Smith', 'https://example.com/new-avatar.jpg')

    assert.equal(user.firstName, 'Jane')
    assert.equal(user.lastName, 'Smith')
    assert.equal(user.fullName, 'Jane Smith')
    assert.equal(user.avatarUrl, 'https://example.com/new-avatar.jpg')
  })

  test('should update only provided profile fields', ({ assert }) => {
    const user = User.create({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    })
    const originalFirstName = user.firstName

    user.updateProfile(undefined, 'NewLastName')

    assert.equal(user.firstName, originalFirstName)
    assert.equal(user.lastName, 'NewLastName')
  })

  test('should change password with valid new password', ({ assert }) => {
    const user = User.create({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    })
    const newPassword = 'newpassword123'
    
    user.changePassword(newPassword)

    assert.equal(user.password, newPassword)
  })

  test('should throw error when changing to invalid password', ({ assert }) => {
    const user = User.create({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    })

    assert.throws(() => {
      user.changePassword('123')
    }, 'Domain validation failed for password with value "[REDACTED]": must be at least 8 characters long')
  })

  test('should verify email', ({ assert }) => {
    const user = User.create({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    })
    assert.equal(user.isEmailVerified, false)

    user.verifyEmail()

    assert.equal(user.isEmailVerified, true)
    assert.instanceOf(user.emailVerifiedAt, Date)
  })

  test('should serialize to JSON correctly', ({ assert }) => {
    const user = User.create({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    })

    const json = user.toJSON()

    assert.equal(json.firstName, 'John')
    assert.equal(json.lastName, 'Doe')
    assert.equal(json.fullName, 'John Doe')
    assert.equal(json.username, 'johndoe')
    assert.equal(json.email, 'john@example.com')
    assert.exists(json.uuid)
    assert.exists(json.createdAt)
    assert.equal(json.isEmailVerified, false)
  })

  test('should not include password in JSON', ({ assert }) => {
    const user = User.create({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    })
    const json = user.toJSON()

    assert.notProperty(json, 'password')
  })
})
