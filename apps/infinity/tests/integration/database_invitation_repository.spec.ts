import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'
import Friendship from '#models/friendship'
import User from '#models/user'

async function createUser(userUuid: string, email: string, fullName = 'Invitation Issuer') {
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

test.group('DatabaseInvitationRepository', () => {
  test('generates, validates and consumes an invitation during registration', async ({
    assert,
  }) => {
    const repository = new DatabaseInvitationRepository()
    const issuerUserUuid = randomUUID()
    await createUser(issuerUserUuid, `issuer.${Date.now()}@example.com`)

    const generated = await repository.generateCode({
      issuerUserUuid,
      maxUses: 1,
      expiresAt: null,
    })

    assert.isTrue(generated.isSuccess)
    assert.match(generated.value!.plainCode, /^[\dA-Z-]+$/)

    const validated = await repository.validateCode(generated.value!.plainCode)
    assert.isTrue(validated.isSuccess)
    assert.equal(validated.value!.invitation.issuerUserUuid, issuerUserUuid)

    const registered = await repository.registerUserWithInvitation({
      fullName: 'Invited Member',
      email: `invited.${Date.now()}@example.com`,
      password: 'password123',
      invitationCode: generated.value!.plainCode,
    })

    assert.isTrue(registered.isSuccess)
    assert.equal(registered.value!.user.invitedByUserUuid, issuerUserUuid)

    const friendship = await Friendship.query()
      .where('pair_key', `${[issuerUserUuid, registered.value!.user.uuid].sort().join('::')}`)
      .first()

    assert.exists(friendship)

    const reused = await repository.registerUserWithInvitation({
      fullName: 'Another Member',
      email: `another.${Date.now()}@example.com`,
      password: 'password123',
      invitationCode: generated.value!.plainCode,
    })

    assert.isTrue(reused.isFailure)
    assert.equal(reused.error, 'Invitation code has already been used')
  })

  test('enforces restricted email and can revoke active invitations', async ({ assert }) => {
    const repository = new DatabaseInvitationRepository()
    const issuerUserUuid = randomUUID()
    await createUser(issuerUserUuid, `issuer.restricted.${Date.now()}@example.com`)

    const restrictedEmail = `friend.${Date.now()}@example.com`
    const generated = await repository.generateCode({
      issuerUserUuid,
      restrictedEmail,
      maxUses: 1,
      expiresAt: null,
    })

    assert.isTrue(generated.isSuccess)

    const invalidEmailValidation = await repository.validateCode(
      generated.value!.plainCode,
      'other@example.com'
    )
    assert.isTrue(invalidEmailValidation.isFailure)
    assert.equal(
      invalidEmailValidation.error,
      'Invitation code is not valid for this email address'
    )

    const revoked = await repository.revokeByUuid(generated.value!.invitation.uuid, issuerUserUuid)
    assert.isTrue(revoked.isSuccess)
    assert.equal(revoked.value!.status, 'revoked')

    const validatedAfterRevoke = await repository.validateCode(generated.value!.plainCode)
    assert.isTrue(validatedAfterRevoke.isFailure)
    assert.equal(validatedAfterRevoke.error, 'Invitation code has been revoked')
  })

  test('allows only the owner or an admin to revoke an invitation', async ({ assert }) => {
    const repository = new DatabaseInvitationRepository()
    const issuerUserUuid = randomUUID()
    const outsiderUserUuid = randomUUID()
    const adminUserUuid = randomUUID()

    await createUser(issuerUserUuid, `issuer.owner.${Date.now()}@example.com`)
    await createUser(outsiderUserUuid, `issuer.outsider.${Date.now()}@example.com`, 'Outsider User')
    await User.updateOrCreate(
      { userUuid: adminUserUuid },
      {
        userUuid: adminUserUuid,
        fullName: 'Admin User',
        email: `issuer.admin.${Date.now()}@example.com`,
        password: 'password123',
        role: 'ADMIN',
      }
    )

    const generated = await repository.generateCode({
      issuerUserUuid,
      maxUses: 1,
      expiresAt: null,
    })

    assert.isTrue(generated.isSuccess)

    const outsiderRevoke = await repository.revokeByUuid(
      generated.value!.invitation.uuid,
      outsiderUserUuid
    )
    assert.isTrue(outsiderRevoke.isFailure)
    assert.equal(outsiderRevoke.error, 'Invitation code was not found')

    const adminRevoke = await repository.revokeByUuid(
      generated.value!.invitation.uuid,
      adminUserUuid,
      true
    )
    assert.isTrue(adminRevoke.isSuccess)
    assert.equal(adminRevoke.value!.status, 'revoked')
  })
})
