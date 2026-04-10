import { router } from '@inertiajs/react'
import { Avatar, AvatarFallback } from '@infinity.dev/ui/primitives/avatar'
import { Badge } from '@infinity.dev/ui/primitives/badge'
import { Button } from '@infinity.dev/ui/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@infinity.dev/ui/primitives/card'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@infinity.dev/ui/primitives/drawer'
import { ScrollArea } from '@infinity.dev/ui/primitives/scroll-area'
import { Users, Wifi, DoorOpen, Gamepad2, ChevronUp, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTransmit } from '../contexts/TransmitContext'
import { useI18n } from '../i18n/use_i18n'
import {
  applyFriendPresenceUpdate,
  countOnlineFriends,
  partitionFriendPresence,
  sortFriendPresence,
  type FriendPresenceEntry,
} from './friend_presence_state'

const SOCIAL_PRESENCE_SNAPSHOT_URL = '/api/v1/friends/presence'
const SOCIAL_PRESENCE_HEARTBEAT_URL = '/api/v1/friends/presence/heartbeat'
const SOCIAL_PRESENCE_OFFLINE_URL = '/api/v1/friends/presence/offline'
const SOCIAL_PRESENCE_HEARTBEAT_INTERVAL_MS = 20_000
const SOCIAL_PRESENCE_CLIENT_SESSION_STORAGE_KEY = 'infinity.socialPresence.clientSessionId'

interface FriendPresencePanelProps {
  currentUser?: {
    uuid: string
    fullName: string
  }
}

type FriendPresenceApiResponse = {
  friends?: FriendPresenceEntry[]
}

type FriendPresenceEventPayload = {
  type?: string
  presence?: Partial<FriendPresenceEntry>
}

function readCsrfToken(): string | null {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? null
}

function getClientSessionId(): string {
  const existingValue = window.sessionStorage.getItem(SOCIAL_PRESENCE_CLIENT_SESSION_STORAGE_KEY)
  if (existingValue) {
    return existingValue
  }

  const nextValue = crypto.randomUUID()
  window.sessionStorage.setItem(SOCIAL_PRESENCE_CLIENT_SESSION_STORAGE_KEY, nextValue)
  return nextValue
}

function normalizePresenceEntry(rawEntry: Partial<FriendPresenceEntry> | null | undefined) {
  if (
    !rawEntry ||
    typeof rawEntry.friendUserUuid !== 'string' ||
    typeof rawEntry.displayName !== 'string'
  ) {
    return null
  }

  const status = rawEntry.status
  if (
    status !== 'offline' &&
    status !== 'online' &&
    status !== 'in_lobby' &&
    status !== 'in_game'
  ) {
    return null
  }

  return {
    friendUserUuid: rawEntry.friendUserUuid,
    displayName: rawEntry.displayName,
    status,
    lobbyId: typeof rawEntry.lobbyId === 'string' ? rawEntry.lobbyId : null,
    lobbyName: typeof rawEntry.lobbyName === 'string' ? rawEntry.lobbyName : null,
    gameId: typeof rawEntry.gameId === 'string' ? rawEntry.gameId : null,
    updatedAt:
      typeof rawEntry.updatedAt === 'string' ? rawEntry.updatedAt : new Date().toISOString(),
  } satisfies FriendPresenceEntry
}

function statusBadgeClass(status: FriendPresenceEntry['status']): string {
  switch (status) {
    case 'in_game':
      return 'bg-emerald-600 text-white'
    case 'in_lobby':
      return 'bg-sky-600 text-white'
    case 'online':
      return 'bg-green-600 text-white'
    case 'offline':
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function presenceRowDetail(entry: FriendPresenceEntry, t: ReturnType<typeof useI18n>['t']): string {
  if (entry.status === 'in_game' && entry.gameId) {
    return t('friends.presence.detailsInGame', { gameId: entry.gameId.slice(0, 8) })
  }

  if (entry.status === 'in_lobby' && entry.lobbyName) {
    return t('friends.presence.detailsInLobby', { lobbyName: entry.lobbyName })
  }

  if (entry.status === 'online') {
    return t('friends.presence.detailsOnline')
  }

  return t('friends.presence.detailsOffline')
}

function presenceStatusLabel(
  entry: FriendPresenceEntry,
  t: ReturnType<typeof useI18n>['t']
): string {
  switch (entry.status) {
    case 'in_game':
      return t('friends.presence.status.inGame')
    case 'in_lobby':
      return t('friends.presence.status.inLobby')
    case 'online':
      return t('friends.presence.status.online')
    case 'offline':
    default:
      return t('friends.presence.status.offline')
  }
}

function statusIcon(entry: FriendPresenceEntry) {
  switch (entry.status) {
    case 'in_game':
      return <Gamepad2 className="h-4 w-4" aria-hidden="true" />
    case 'in_lobby':
      return <DoorOpen className="h-4 w-4" aria-hidden="true" />
    case 'online':
      return <Wifi className="h-4 w-4" aria-hidden="true" />
    case 'offline':
    default:
      return <Users className="h-4 w-4" aria-hidden="true" />
  }
}

function buildAvatarFallback(displayName: string): string {
  return displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('')
}

function PresenceSection({
  title,
  entries,
  emptyState,
  t,
}: {
  title: string
  entries: FriendPresenceEntry[]
  emptyState: string
  t: ReturnType<typeof useI18n>['t']
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {emptyState}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.friendUserUuid}
              className="rounded-xl border border-border bg-background px-3 py-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{buildAvatarFallback(entry.displayName)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">{entry.displayName}</p>
                    <Badge className={statusBadgeClass(entry.status)}>
                      <span className="flex items-center gap-1">
                        {statusIcon(entry)}
                        {presenceStatusLabel(entry, t)}
                      </span>
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{presenceRowDetail(entry, t)}</p>

                  {entry.status === 'in_lobby' && entry.lobbyId && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => router.visit(`/lobbies/${entry.lobbyId}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t('friends.presence.joinLobbyAction')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function FriendPresencePanelCard({
  entries,
  isConnected,
  isLoading,
  error,
  t,
}: {
  entries: FriendPresenceEntry[]
  isConnected: boolean
  isLoading: boolean
  error: string | null
  t: ReturnType<typeof useI18n>['t']
}) {
  const { online, offline } = partitionFriendPresence(entries)

  return (
    <Card className="border-border bg-background/95 shadow-2xl backdrop-blur">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              {t('friends.presence.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('friends.presence.subtitle')}</p>
          </div>

          <Badge className={isConnected ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}>
            {isConnected
              ? t('friends.presence.realtimeConnected')
              : t('friends.presence.realtimeSyncing')}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t('friends.presence.onlineCount', { count: countOnlineFriends(entries) })}</span>
          <span aria-hidden="true">•</span>
          <span>{t('friends.presence.totalCount', { count: entries.length })}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t('friends.presence.syncIssue')}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2" aria-label={t('friends.presence.loading')}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`friend-presence-skeleton-${index}`}
                className="h-16 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <ScrollArea className="max-h-[22rem] pr-3">
            <div className="space-y-5">
              <PresenceSection
                title={t('friends.presence.onlineSection')}
                entries={online}
                emptyState={t('friends.presence.onlineEmptyState')}
                t={t}
              />
              <PresenceSection
                title={t('friends.presence.offlineSection')}
                entries={offline}
                emptyState={t('friends.presence.offlineEmptyState')}
                t={t}
              />
            </div>
          </ScrollArea>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button variant="neutral" size="sm" onClick={() => router.visit('/friends')}>
            {t('friends.presence.openFriendsAction')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function FriendPresencePanel({ currentUser }: FriendPresencePanelProps) {
  const { t } = useI18n()
  const { isConnected, subscribeToUserNotifications } = useTransmit()
  const [entries, setEntries] = useState<FriendPresenceEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const clientSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') {
      return
    }

    const csrfToken = readCsrfToken()
    const clientSessionId = getClientSessionId()
    clientSessionIdRef.current = clientSessionId
    let isActive = true

    const loadSnapshot = async () => {
      setIsLoading(true)

      try {
        const response = await fetch(SOCIAL_PRESENCE_SNAPSHOT_URL, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          credentials: 'same-origin',
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch friend presence snapshot: ${response.status}`)
        }

        const payload = (await response.json()) as FriendPresenceApiResponse
        if (!isActive) {
          return
        }

        const normalizedEntries = Array.isArray(payload.friends)
          ? payload.friends
              .map((entry) => normalizePresenceEntry(entry))
              .filter((entry): entry is FriendPresenceEntry => entry !== null)
          : []

        setEntries(sortFriendPresence(normalizedEntries))
        setError(null)
      } catch (snapshotError) {
        if (isActive) {
          console.error('Failed to load friend presence snapshot:', snapshotError)
          setError('snapshot_failed')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    const sendPresenceUpdate = async (url: string, keepalive = false) => {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        },
        body: JSON.stringify({
          clientSessionId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Friend presence request failed: ${response.status}`)
      }
    }

    const heartbeat = async () => {
      try {
        await sendPresenceUpdate(SOCIAL_PRESENCE_HEARTBEAT_URL)
        if (isActive) {
          setError(null)
        }
      } catch (heartbeatError) {
        if (isActive) {
          console.error('Failed to heartbeat social presence:', heartbeatError)
          setError('heartbeat_failed')
        }
      }
    }

    const sendOffline = () => {
      void sendPresenceUpdate(SOCIAL_PRESENCE_OFFLINE_URL, true).catch((offlineError) => {
        console.error('Failed to clear social presence on page hide:', offlineError)
      })
    }

    const handleWindowFocus = () => {
      void heartbeat()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void heartbeat()
      }
    }

    void loadSnapshot().then(() => heartbeat())

    const heartbeatInterval = window.setInterval(() => {
      void heartbeat()
    }, SOCIAL_PRESENCE_HEARTBEAT_INTERVAL_MS)

    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('pagehide', sendOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isActive = false
      window.clearInterval(heartbeatInterval)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('pagehide', sendOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentUser?.uuid])

  useEffect(() => {
    if (!currentUser || !isConnected) {
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    void subscribeToUserNotifications(currentUser.uuid, (rawEvent: FriendPresenceEventPayload) => {
      if (rawEvent?.type !== 'social.presence.updated') {
        return
      }

      const nextEntry = normalizePresenceEntry(rawEvent.presence)
      if (!nextEntry) {
        return
      }

      setEntries((currentEntries) => applyFriendPresenceUpdate(currentEntries, nextEntry))
    })
      .then((cleanup) => {
        if (cancelled) {
          cleanup()
          return
        }

        unsubscribe = cleanup
      })
      .catch((subscriptionError) => {
        console.error('Failed to subscribe to social presence updates:', subscriptionError)
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [currentUser?.uuid, isConnected, subscribeToUserNotifications])

  if (!currentUser) {
    return null
  }

  const onlineCount = countOnlineFriends(entries)
  const buttonLabel = t('friends.presence.toggleLabel', {
    count: onlineCount,
  })

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[60] hidden md:block">
        <div className="relative">
          {isOpen && (
            <div className="absolute bottom-16 right-0 w-[22rem]">
              <FriendPresencePanelCard
                entries={entries}
                isConnected={isConnected}
                isLoading={isLoading}
                error={error}
                t={t}
              />
            </div>
          )}

          <Button
            type="button"
            aria-expanded={isOpen}
            aria-label={buttonLabel}
            onClick={() => setIsOpen((currentValue) => !currentValue)}
            className="min-w-[14rem] justify-between"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('friends.presence.buttonLabel')}
            </span>
            <span className="flex items-center gap-2 text-xs">
              {t('friends.presence.onlineBadge', { count: onlineCount })}
              <ChevronUp className={`h-4 w-4 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
            </span>
          </Button>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-[60] md:hidden">
        <Button
          type="button"
          aria-label={buttonLabel}
          onClick={() => setIsOpen(true)}
          className="min-w-[12rem] justify-between"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('friends.presence.buttonLabel')}
          </span>
          <Badge className="bg-green-600 text-white">
            {t('friends.presence.onlineBadge', { count: onlineCount })}
          </Badge>
        </Button>
      </div>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="md:hidden">
          <DrawerHeader>
            <DrawerTitle>{t('friends.presence.title')}</DrawerTitle>
            <DrawerDescription>{t('friends.presence.subtitle')}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <FriendPresencePanelCard
              entries={entries}
              isConnected={isConnected}
              isLoading={isLoading}
              error={error}
              t={t}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
