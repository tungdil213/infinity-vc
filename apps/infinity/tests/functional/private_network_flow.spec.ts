import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import User from '#models/user'
import Friendship from '#models/friendship'
import FriendRequest from '#models/friend_request'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'

async function createUser(userUuid: string, email: string, fullName: string) {
  return User.updateOrCreate(
    { userUuid },
    {
      userUuid,
      fullName,
      email,
      password: 'password123',
    }
  )
}

test.group('Private network flow', () => {
  test('validates invitation, registers invited user and creates friendship', async ({
    client,
    assert,
  }) => {
    const invitationRepository = new DatabaseInvitationRepository()
    const inviterUserUuid = randomUUID()
    const inviter = await createUser(
      inviterUserUuid,
      `inviter.${Date.now()}@example.com`,
      'Inviter User'
    )

    const generated = await invitationRepository.generateCode({
      issuerUserUuid: inviterUserUuid,
      maxUses: 1,
      expiresAt: null,
    })

    assert.isTrue(generated.isSuccess)

    const validateResponse = await client
      .post('/auth/register/validate-invitation')
      .form({
        invitationCode: generated.value!.plainCode,
      })
      .withCsrfToken()
    validateResponse.assertStatus(200)

    const invitedEmail = `invited.${Date.now()}@example.com`
    const registerResponse = await client
      .post('/auth/register')
      .form({
        invitationCode: generated.value!.plainCode,
        fullName: 'Invited User',
        email: invitedEmail,
        password: 'password123',
        password_confirmation: 'password123',
      })
      .redirects(0)
      .withCsrfToken()
    registerResponse.assertStatus(302)

    const invitedUser = await User.query().where('email', invitedEmail).firstOrFail()
    assert.equal(invitedUser.invitedByUserUuid, inviterUserUuid)

    const duplicateRegisterResponse = await client
      .post('/auth/register')
      .form({
        invitationCode: generated.value!.plainCode,
        fullName: 'Late User',
        email: `late.${Date.now()}@example.com`,
        password: 'password123',
        password_confirmation: 'password123',
      })
      .redirects(0)
      .withCsrfToken()
    duplicateRegisterResponse.assertStatus(400)

    const sendRequestResponse = await client
      .post('/friends/requests')
      .loginAs(inviter)
      .form({
        recipientUserUuid: invitedUser.userUuid,
      })
      .redirects(0)
      .withCsrfToken()
    sendRequestResponse.assertStatus(302)

    const friendRequest = await FriendRequest.query()
      .where('requester_user_uuid', inviterUserUuid)
      .where('recipient_user_uuid', invitedUser.userUuid)
      .firstOrFail()

    const acceptResponse = await client
      .post(`/friends/requests/${friendRequest.uuid}/accept`)
      .loginAs(invitedUser)
      .form({})
      .redirects(0)
      .withCsrfToken()
    acceptResponse.assertStatus(302)

    const friendship = await Friendship.query()
      .where('pair_key', `${[inviterUserUuid, invitedUser.userUuid].sort().join('::')}`)
      .first()

    assert.exists(friendship)
  })
})
