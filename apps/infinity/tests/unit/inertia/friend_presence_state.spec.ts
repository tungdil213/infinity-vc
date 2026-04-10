import { test } from '@japa/runner'
import {
  applyFriendPresenceUpdate,
  countOnlineFriends,
  partitionFriendPresence,
  sortFriendPresence,
  type FriendPresenceEntry,
} from '../../../inertia/layouts/friend_presence_state.js'

function makeEntry(overrides: Partial<FriendPresenceEntry>): FriendPresenceEntry {
  return {
    friendUserUuid: overrides.friendUserUuid ?? crypto.randomUUID(),
    displayName: overrides.displayName ?? 'Friend User',
    status: overrides.status ?? 'offline',
    lobbyId: overrides.lobbyId ?? null,
    lobbyName: overrides.lobbyName ?? null,
    gameId: overrides.gameId ?? null,
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  }
}

test.group('friend_presence_state', () => {
  test('sorts active friends before offline friends', ({ assert }) => {
    const sorted = sortFriendPresence([
      makeEntry({ friendUserUuid: 'offline-user', displayName: 'Zed', status: 'offline' }),
      makeEntry({ friendUserUuid: 'lobby-user', displayName: 'Beta', status: 'in_lobby' }),
      makeEntry({ friendUserUuid: 'online-user', displayName: 'Alpha', status: 'online' }),
      makeEntry({ friendUserUuid: 'game-user', displayName: 'Gamma', status: 'in_game' }),
    ])

    assert.deepEqual(
      sorted.map((entry) => entry.friendUserUuid),
      ['game-user', 'lobby-user', 'online-user', 'offline-user']
    )
  })

  test('applies realtime updates without duplicating entries', ({ assert }) => {
    const initialEntries = [
      makeEntry({ friendUserUuid: 'friend-1', displayName: 'Alice', status: 'offline' }),
      makeEntry({ friendUserUuid: 'friend-2', displayName: 'Bob', status: 'online' }),
    ]

    const updatedEntries = applyFriendPresenceUpdate(
      initialEntries,
      makeEntry({
        friendUserUuid: 'friend-1',
        displayName: 'Alice',
        status: 'in_game',
        gameId: 'game-123',
      })
    )

    assert.lengthOf(updatedEntries, 2)
    assert.equal(updatedEntries[0].friendUserUuid, 'friend-1')
    assert.equal(updatedEntries[0].status, 'in_game')
  })

  test('partitions online and offline groups and counts online friends', ({ assert }) => {
    const entries = [
      makeEntry({ friendUserUuid: 'friend-1', displayName: 'Alice', status: 'in_lobby' }),
      makeEntry({ friendUserUuid: 'friend-2', displayName: 'Bob', status: 'offline' }),
      makeEntry({ friendUserUuid: 'friend-3', displayName: 'Charlie', status: 'online' }),
    ]

    const partition = partitionFriendPresence(entries)

    assert.lengthOf(partition.online, 2)
    assert.lengthOf(partition.offline, 1)
    assert.equal(countOnlineFriends(entries), 2)
  })
})
