import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import User from '#models/user'
import { DatabaseFriendRepository } from '#infrastructure/repositories/database_friend_repository'

async function createUser(userUuid: string, email: string, fullName: string) {
  await User.updateOrCreate(
    { userUuid },
    {
      userUuid,
      fullName,
      email,
      password: 'password123',
    }
  )
}

test.group('DatabaseFriendRepository', () => {
  test('sends requests, prevents duplicates and supports accept/remove flow', async ({
    assert,
  }) => {
    const repository = new DatabaseFriendRepository()
    const requesterUserUuid = randomUUID()
    const recipientUserUuid = randomUUID()

    await createUser(requesterUserUuid, `friend.a.${Date.now()}@example.com`, 'Requester User')
    await createUser(recipientUserUuid, `friend.b.${Date.now()}@example.com`, 'Recipient User')

    const sent = await repository.sendRequest(requesterUserUuid, recipientUserUuid)
    assert.isTrue(sent.isSuccess)
    assert.equal(sent.value!.status, 'pending')

    const duplicate = await repository.sendRequest(requesterUserUuid, recipientUserUuid)
    assert.isTrue(duplicate.isFailure)
    assert.equal(duplicate.error, 'A friend request is already pending for this user')

    const accepted = await repository.acceptRequest(sent.value!.uuid, recipientUserUuid)
    assert.isTrue(accepted.isSuccess)
    assert.equal(accepted.value!.friendUserUuid, requesterUserUuid)

    const overview = await repository.listOverview(requesterUserUuid)
    assert.lengthOf(overview.friends, 1)
    assert.equal(overview.friends[0].friendUserUuid, recipientUserUuid)

    const removed = await repository.removeFriend(requesterUserUuid, recipientUserUuid)
    assert.isTrue(removed.isSuccess)

    const refreshedOverview = await repository.listOverview(requesterUserUuid)
    assert.lengthOf(refreshedOverview.friends, 0)
  })

  test('rejects self-requests and supports reject/cancel transitions', async ({ assert }) => {
    const repository = new DatabaseFriendRepository()
    const firstUserUuid = randomUUID()
    const secondUserUuid = randomUUID()

    await createUser(firstUserUuid, `friend.self.${Date.now()}@example.com`, 'Self User')
    await createUser(secondUserUuid, `friend.other.${Date.now()}@example.com`, 'Other User')

    const selfRequest = await repository.sendRequest(firstUserUuid, firstUserUuid)
    assert.isTrue(selfRequest.isFailure)
    assert.equal(selfRequest.error, 'You cannot send a friend request to yourself')

    const sent = await repository.sendRequest(firstUserUuid, secondUserUuid)
    assert.isTrue(sent.isSuccess)

    const cancelled = await repository.cancelRequest(sent.value!.uuid, firstUserUuid)
    assert.isTrue(cancelled.isSuccess)
    assert.equal(cancelled.value!.status, 'cancelled')

    const resent = await repository.sendRequest(firstUserUuid, secondUserUuid)
    assert.isTrue(resent.isSuccess)

    const rejected = await repository.rejectRequest(resent.value!.uuid, secondUserUuid)
    assert.isTrue(rejected.isSuccess)
    assert.equal(rejected.value!.status, 'rejected')
  })
})
