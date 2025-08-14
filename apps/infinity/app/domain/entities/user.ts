import { BaseEntity } from './base_entity.js'

export interface UserData {
  uuid?: string
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  isEmailVerified?: boolean
  avatarUrl?: string
  emailVerifiedAt?: Date
  createdAt?: Date
}

export default class User extends BaseEntity {
  private constructor(
    private _uuid: string,
    private _firstName: string,
    private _lastName: string,
    private _username: string,
    private _email: string,
    private _password: string,
    private _isEmailVerified: boolean = false,
    private _avatarUrl?: string,
    private _emailVerifiedAt?: Date,
    private _createdAt: Date = new Date()
  ) {
    super()
  }

  static create(data: UserData): User {
    const uuid = data.uuid || crypto.randomUUID()

    // Trim data before validation
    const trimmedUsername = data.username.trim()
    const trimmedEmail = data.email.toLowerCase().trim()

    // Validation
    User.validateEmail(trimmedEmail)
    User.validateUsername(trimmedUsername)
    User.validatePassword(data.password)

    return new User(
      uuid,
      data.firstName.trim(),
      data.lastName.trim(),
      trimmedUsername,
      trimmedEmail,
      data.password,
      data.isEmailVerified || false,
      data.avatarUrl,
      data.emailVerifiedAt,
      data.createdAt || new Date()
    )
  }

  static reconstitute(
    uuid: string,
    firstName: string,
    lastName: string,
    username: string,
    email: string,
    password: string,
    avatarUrl?: string,
    emailVerifiedAt?: Date,
    createdAt?: Date
  ): User {
    return new User(
      uuid,
      firstName,
      lastName,
      username,
      email,
      password,
      avatarUrl,
      emailVerifiedAt,
      createdAt || new Date()
    )
  }

  // Getters
  get uuid(): string {
    return this._uuid
  }

  get firstName(): string {
    return this._firstName
  }

  get lastName(): string {
    return this._lastName
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`
  }

  get username(): string {
    return this._username
  }

  get email(): string {
    return this._email
  }

  get password(): string {
    return this._password
  }

  get avatarUrl(): string | undefined {
    return this._avatarUrl
  }

  get isEmailVerified(): boolean {
    return this._isEmailVerified
  }

  get emailVerifiedAt(): Date | undefined {
    return this._emailVerifiedAt
  }

  get createdAt(): Date {
    return this._createdAt
  }

  // Methods
  updateProfile(firstName?: string, lastName?: string, avatarUrl?: string): void {
    if (firstName) {
      this._firstName = firstName.trim()
    }
    if (lastName) {
      this._lastName = lastName.trim()
    }
    if (avatarUrl !== undefined) {
      this._avatarUrl = avatarUrl
    }
  }

  changePassword(newPassword: string): void {
    User.validatePassword(newPassword)
    this._password = newPassword // Should be hashed before calling this
  }

  verifyEmail(): void {
    this._isEmailVerified = true
    this._emailVerifiedAt = new Date()
  }

  // Validation methods
  private static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }
  }

  private static validateUsername(username: string): void {
    if (username.length < 3 || username.length > 50) {
      throw new Error('Username must be between 3 and 50 characters')
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, underscores and hyphens')
    }
  }

  private static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }
  }

  // Serialization
  toJSON() {
    return {
      uuid: this._uuid,
      firstName: this._firstName,
      lastName: this._lastName,
      fullName: this.fullName,
      username: this._username,
      email: this._email,
      avatarUrl: this._avatarUrl,
      emailVerifiedAt: this._emailVerifiedAt,
      isEmailVerified: this.isEmailVerified,
      createdAt: this._createdAt,
    }
  }
}
