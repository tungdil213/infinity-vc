import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

export class UserRegisteredEvent extends DomainEvent {
  constructor(userId: string, email: string, username: string) {
    super('iam.user.registered', { userId, email, username })
  }

  get userId(): string {
    return this.payload.userId
  }

  get email(): string {
    return this.payload.email
  }

  get username(): string {
    return this.payload.username
  }
}
