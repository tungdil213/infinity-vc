// Value Objects
export { Email } from './value_objects/email.vo.js'
export { Password } from './value_objects/password.vo.js'
export { Username } from './value_objects/username.vo.js'

// Entities
export { User } from './entities/user.entity.js'

// Events
export { UserRegisteredEvent } from './events/user_registered.event.js'
export { UserLoggedInEvent } from './events/user_logged_in.event.js'

// Repositories
export type { UserRepository } from './repositories/user_repository.interface.js'
