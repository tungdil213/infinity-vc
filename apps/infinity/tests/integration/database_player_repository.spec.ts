import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import Player from '#domain/entities/player'
import User from '#models/user'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'

async function createUser(userUuid: string, email: string) {
  await User.updateOrCreate(
    { userUuid },
    {
      userUuid,
      fullName: 'Integration User',
      email,
      password: 'password123',
    }
  )
}

test.group('DatabasePlayerRepository', () => {
  test('can save and find player by uuid, user uuid and nickname', async ({ assert }) => {
    const repository = new DatabasePlayerRepository()

    const userUuid = randomUUID()
    const playerUuid = randomUUID()
    const email = `player.repo.${Date.now()}@example.com`

    await createUser(userUuid, email)

    await repository.save(
      Player.create({
        uuid: playerUuid,
        userUuid,
        nickName: 'Repo Player',
      })
    )

    const byUuid = await repository.findByUuid(playerUuid)
    const byUserUuid = await repository.findByUserUuid(userUuid)
    const byNickName = await repository.findByNickName('repo player')

    assert.isNotNull(byUuid)
    assert.isNotNull(byUserUuid)
    assert.isNotNull(byNickName)
    assert.equal(byUuid?.uuid, playerUuid)
    assert.equal(byUserUuid?.userUuid, userUuid)
    assert.equal(byNickName?.nickName, 'Repo Player')
  })

  test('delete soft-deletes players and excludes them from lookups', async ({ assert }) => {
    const repository = new DatabasePlayerRepository()

    const userUuid = randomUUID()
    const playerUuid = randomUUID()
    const email = `player.repo.delete.${Date.now()}@example.com`

    await createUser(userUuid, email)
    await repository.save(
      Player.create({
        uuid: playerUuid,
        userUuid,
        nickName: 'Delete Target',
      })
    )

    await repository.delete(playerUuid)

    const deletedByPlayerUuid = await repository.findByUuid(playerUuid)
    const deletedByUserUuid = await repository.findByUserUuid(userUuid)

    assert.isNull(deletedByPlayerUuid)
    assert.isNull(deletedByUserUuid)
  })

  test('findAll only returns active players', async ({ assert }) => {
    const repository = new DatabasePlayerRepository()

    const activeUserUuid = randomUUID()
    const activePlayerUuid = randomUUID()
    const activeEmail = `player.repo.active.${Date.now()}@example.com`

    const deletedUserUuid = randomUUID()
    const deletedPlayerUuid = randomUUID()
    const deletedEmail = `player.repo.deleted.${Date.now()}@example.com`

    await createUser(activeUserUuid, activeEmail)
    await createUser(deletedUserUuid, deletedEmail)

    await repository.save(
      Player.create({
        uuid: activePlayerUuid,
        userUuid: activeUserUuid,
        nickName: 'Active Player',
      })
    )
    await repository.save(
      Player.create({
        uuid: deletedPlayerUuid,
        userUuid: deletedUserUuid,
        nickName: 'Deleted Player',
      })
    )

    await repository.delete(deletedPlayerUuid)

    const allPlayers = await repository.findAll()
    const allUuids = allPlayers.map((player) => player.uuid)

    assert.include(allUuids, activePlayerUuid)
    assert.notInclude(allUuids, deletedPlayerUuid)
  })
})
