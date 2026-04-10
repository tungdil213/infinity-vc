import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import { DatabaseFriendRepository } from '#infrastructure/repositories/database_friend_repository'
import Player from '#models/player'
import User from '#models/user'

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

async function createPlayer(userUuid: string, nickName: string) {
  await Player.updateOrCreate(
    { userUuid },
    {
      userUuid,
      nickName,
      avatarUrl: null,
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
    assert.equal(overview.friends[0].friendDisplayName, 'Recipient User')
    assert.notProperty(overview.friends[0], 'friendEmail')

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
    assert.equal(rejected.value!.requesterDisplayName, 'Self User')
    assert.notProperty(rejected.value!, 'requesterEmail')
  })

  test('searches by public nickname and never exposes email in search results', async ({
    assert,
  }) => {
    const repository = new DatabaseFriendRepository()
    const viewerUserUuid = randomUUID()
    const searchableUserUuid = randomUUID()

    await createUser(viewerUserUuid, `search.viewer.${Date.now()}@example.com`, 'Viewer User')
    await createUser(searchableUserUuid, `search.target.${Date.now()}@example.com`, '')
    await createPlayer(searchableUserUuid, 'ShadowFox')

    const results = await repository.searchUsers('shadow', viewerUserUuid)

    assert.lengthOf(results, 1)
    assert.equal(results[0].userUuid, searchableUserUuid)
    assert.equal(results[0].displayName, 'ShadowFox')
    assert.isTrue(results[0].canReceiveFriendRequests)
    assert.notProperty(results[0], 'email')
  })

  test('marks admin accounts as protected in friend search results', async ({ assert }) => {
    const repository = new DatabaseFriendRepository()
    const viewerUserUuid = randomUUID()
    const adminUserUuid = randomUUID()

    await createUser(viewerUserUuid, `search.viewer.${Date.now()}@example.com`, 'Viewer User')
    await User.updateOrCreate(
      { userUuid: adminUserUuid },
      {
        userUuid: adminUserUuid,
        fullName: 'Admin User',
        email: `search.admin.${Date.now()}@example.com`,
        password: 'password123',
        role: 'ADMIN',
      }
    )

    const results = await repository.searchUsers('admin', viewerUserUuid)

    assert.lengthOf(results, 1)
    assert.equal(results[0].displayName, 'Admin User')
    assert.isFalse(results[0].canReceiveFriendRequests)
  })
})
