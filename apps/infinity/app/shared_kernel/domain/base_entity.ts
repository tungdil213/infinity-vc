import { v4 as uuidv4 } from 'uuid'

/**
 * Base Entity
 * Toutes les entités du domaine étendent cette classe
 */
export abstract class BaseEntity {
  protected readonly _id: string
  protected readonly _createdAt: Date
  protected _updatedAt: Date

  protected constructor(id?: string) {
    this._id = id || uuidv4()
    this._createdAt = new Date()
    this._updatedAt = new Date()
  }

  public get id(): string {
    return this._id
  }

  public get createdAt(): Date {
    return this._createdAt
  }

  public get updatedAt(): Date {
    return this._updatedAt
  }

  protected touch(): void {
    this._updatedAt = new Date()
  }

  public equals(entity?: BaseEntity): boolean {
    if (entity === null || entity === undefined) {
      return false
    }

    if (this === entity) {
      return true
    }

    if (!(entity instanceof this.constructor)) {
      return false
    }

    return this._id === entity._id
  }
}
