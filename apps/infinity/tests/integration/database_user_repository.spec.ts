import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import User from '#domain/entities/user'
import UserModel from '#models/user'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'

function createDomainUser(overrides: Partial<Parameters<typeof User.create>[0]> = {}) {
  const seed = randomUUID().replace(/-/g, '')
  const uuid = overrides.uuid ?? randomUUID()

  return User.create({
    uuid,
    firstName: overrides.firstName ?? 'Repo',
    lastName: overrides.lastName ?? 'User',
    username: overrides.username ?? `repo_${seed.slice(0, 10)}`,
    email: overrides.email ?? `repo.user.${seed.slice(0, 12)}@example.com`,
    password: overrides.password ?? 'password123',
    role: overrides.role ?? 'PLAYER',
  })
}

test.group('DatabaseUserRepository', () => {
  test('saves and retrieves users by uuid/email with exists helpers', async ({ assert }) => {
    const repository = new DatabaseUserRepository()
    const user = createDomainUser()

    await repository.save(user)

    const byUuid = await repository.findByUuid(user.uuid)
    const byEmail = await repository.findByEmail(user.email)
    const allUsers = await repository.findAll()

    assert.isNotNull(byUuid)
    assert.isNotNull(byEmail)
    assert.equal(byUuid?.email, user.email)
    assert.equal(byUuid?.fullName, user.fullName)
    assert.isTrue(await repository.existsByEmail(user.email))
    assert.isFalse(await repository.existsByEmail(`missing.${Date.now()}@example.com`))
    assert.isFalse(await repository.existsByUsername('not-implemented-yet'))
    assert.include(
      allUsers.map((entry) => entry.uuid),
      user.uuid
    )
  })

  test('save updates an existing user when uuid already exists', async ({ assert }) => {
    const repository = new DatabaseUserRepository()
    const uuid = randomUUID()

    const initial = createDomainUser({
      uuid,
      firstName: 'Initial',
      lastName: 'Member',
      username: `initial_${Date.now()}`,
      email: `initial.${Date.now()}@example.com`,
      role: 'PLAYER',
    })
    await repository.save(initial)

    const updated = createDomainUser({
      uuid,
      firstName: 'Updated',
      lastName: 'Admin',
      username: `updated_${Date.now()}`,
      email: `updated.${Date.now()}@example.com`,
      role: 'ADMIN',
    })
    await repository.save(updated)

    const model = await UserModel.query().where('user_uuid', uuid).firstOrFail()
    const domainUser = await repository.findByUuid(uuid)

    assert.equal(model.fullName, 'Updated Admin')
    assert.equal(model.email, updated.email)
    assert.equal(model.role, 'ADMIN')
    assert.equal(domainUser?.email, updated.email)
    assert.equal(domainUser?.role, 'ADMIN')
  })

  test('delete soft-deletes users and excludes them from active queries', async ({ assert }) => {
    const repository = new DatabaseUserRepository()
    const user = createDomainUser()

    await repository.save(user)
    await repository.delete(user.uuid)

    const model = await UserModel.query().where('user_uuid', user.uuid).firstOrFail()
    const byEmail = await repository.findByEmail(user.email)
    const allUsers = await repository.findAll()

    assert.isNotNull(model.deletedAt)
    assert.isNull(byEmail)
    assert.notInclude(
      allUsers.map((entry) => entry.uuid),
      user.uuid
    )
  })

  test('findByUuidOrFail throws for missing users', async ({ assert }) => {
    const repository = new DatabaseUserRepository()

    await assert.rejects(
      () => repository.findByUuidOrFail(randomUUID()),
      /User with identifier/
    )
  })
})
