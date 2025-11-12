import { DomainEvent } from '#shared_kernel/domain/events/domain_event'

export class UserLoggedInEvent extends DomainEvent {
  constructor(userId: string, email: string) {
    super('iam.user.logged_in', { userId, email })
  }

  get userId(): string {
    return this.payload.userId
  }

  get email(): string {
    return this.payload.email
  }
}
