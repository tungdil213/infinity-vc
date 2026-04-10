import { test } from '@japa/runner'
import { SendFriendRequestUseCase } from '../../../app/application/use_cases/send_friend_request_use_case.js'
import User from '../../../app/domain/entities/user.js'
import { USER_ROLES } from '../../../app/domain/value_objects/user_role.js'
import { InMemoryUserRepository } from '../../../app/infrastructure/repositories/in_memory_user_repository.js'

function makeUser(args: {
  uuid: string
  username: string
  email: string
  role?: (typeof USER_ROLES)[keyof typeof USER_ROLES]
}) {
  return User.create({
    uuid: args.uuid,
    firstName: 'Test',
    lastName: 'User',
    username: args.username,
    email: args.email,
    password: 'password123',
    role: args.role,
  })
}

test.group('SendFriendRequestUseCase', () => {
  test('rejects friend requests from non-admin users', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const friendRepository = {
      sendRequestCalled: false,
      async sendRequest() {
        this.sendRequestCalled = true
        throw new Error('sendRequest should not be called')
      },
    }

    await userRepository.save(
      makeUser({
        uuid: 'player-1',
        username: 'player1',
        email: 'player1@example.com',
        role: USER_ROLES.PLAYER,
      })
    )
    await userRepository.save(
      makeUser({
        uuid: 'player-2',
        username: 'player2',
        email: 'player2@example.com',
        role: USER_ROLES.PLAYER,
      })
    )

    const useCase = new SendFriendRequestUseCase(friendRepository as any, userRepository)
    const result = await useCase.execute('player-1', 'player-2')

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Only admins can send friend requests')
    assert.isFalse(friendRepository.sendRequestCalled)
  })

  test('rejects friend requests targeting admin accounts', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const friendRepository = {
      sendRequestCalled: false,
      async sendRequest() {
        this.sendRequestCalled = true
        throw new Error('sendRequest should not be called')
      },
    }

    await userRepository.save(
      makeUser({
        uuid: 'admin-sender',
        username: 'adminsender',
        email: 'admin.sender@example.com',
        role: USER_ROLES.ADMIN,
      })
    )
    await userRepository.save(
      makeUser({
        uuid: 'admin-target',
        username: 'admintarget',
        email: 'admin.target@example.com',
        role: USER_ROLES.ADMIN,
      })
    )

    const useCase = new SendFriendRequestUseCase(friendRepository as any, userRepository)
    const result = await useCase.execute('admin-sender', 'admin-target')

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'You cannot send a friend request to an admin')
    assert.isFalse(friendRepository.sendRequestCalled)
  })

  test('allows admins to send requests to non-admin users', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const friendRepository = {
      async sendRequest(requesterUserUuid: string, recipientUserUuid: string) {
        return {
          isSuccess: true,
          isFailure: false,
          value: {
            uuid: 'request-1',
            requesterUserUuid,
            requesterDisplayName: 'Admin User',
            recipientUserUuid,
            recipientDisplayName: 'Member User',
            status: 'pending',
            createdAt: new Date(),
            respondedAt: null,
          },
        }
      },
    }

    await userRepository.save(
      makeUser({
        uuid: 'admin-sender',
        username: 'adminsender',
        email: 'admin.sender@example.com',
        role: USER_ROLES.ADMIN,
      })
    )
    await userRepository.save(
      makeUser({
        uuid: 'member-target',
        username: 'membertarget',
        email: 'member.target@example.com',
        role: USER_ROLES.PLAYER,
      })
    )

    const useCase = new SendFriendRequestUseCase(friendRepository as any, userRepository)
    const result = await useCase.execute('admin-sender', 'member-target')

    assert.isTrue(result.isSuccess)
    assert.equal(result.value!.requesterUserUuid, 'admin-sender')
    assert.equal(result.value!.recipientUserUuid, 'member-target')
  })
})
