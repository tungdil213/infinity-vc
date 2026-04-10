export type FriendPresenceStatus = 'offline' | 'online' | 'in_lobby' | 'in_game'

export interface FriendPresenceEntry {
  friendUserUuid: string
  displayName: string
  status: FriendPresenceStatus
  lobbyId: string | null
  lobbyName: string | null
  gameId: string | null
  updatedAt: string
}

const STATUS_PRIORITY: Record<FriendPresenceStatus, number> = {
  in_game: 0,
  in_lobby: 1,
  online: 2,
  offline: 3,
}

export function isFriendOnline(status: FriendPresenceStatus): boolean {
  return status !== 'offline'
}

export function sortFriendPresence(entries: FriendPresenceEntry[]): FriendPresenceEntry[] {
  return [...entries].sort((left, right) => {
    const statusDelta = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status]
    if (statusDelta !== 0) {
      return statusDelta
    }

    return left.displayName.localeCompare(right.displayName, undefined, {
      sensitivity: 'base',
    })
  })
}

export function applyFriendPresenceUpdate(
  entries: FriendPresenceEntry[],
  nextEntry: FriendPresenceEntry
): FriendPresenceEntry[] {
  const withoutPrevious = entries.filter(
    (entry) => entry.friendUserUuid !== nextEntry.friendUserUuid
  )
  return sortFriendPresence([...withoutPrevious, nextEntry])
}

export function countOnlineFriends(entries: FriendPresenceEntry[]): number {
  return entries.filter((entry) => isFriendOnline(entry.status)).length
}

export function partitionFriendPresence(entries: FriendPresenceEntry[]): {
  online: FriendPresenceEntry[]
  offline: FriendPresenceEntry[]
} {
  const sorted = sortFriendPresence(entries)

  return {
    online: sorted.filter((entry) => isFriendOnline(entry.status)),
    offline: sorted.filter((entry) => !isFriendOnline(entry.status)),
  }
}
