import { router } from '@inertiajs/react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useTransmit } from '../contexts/TransmitContext'
import { useI18n } from '../i18n/use_i18n'

interface LobbyOwnerFullEvent {
  type?: string
  lobbyUuid?: string
  lobbyName?: string
  currentPlayers?: number
  maxPlayers?: number
  timestamp?: string
  triggeredBy?: {
    uuid?: string
    nickName?: string
  }
}

interface LobbyOwnerNotificationsProps {
  userUuid?: string
}

export function LobbyOwnerNotifications({ userUuid }: LobbyOwnerNotificationsProps) {
  const { isConnected, subscribeToUserNotifications } = useTransmit()
  const { t } = useI18n()
  const seenNotificationKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!userUuid || !isConnected) {
      return
    }

    let isActive = true
    let unsubscribe: (() => void) | null = null

    const handleEvent = (rawEvent: unknown) => {
      const event = (rawEvent ?? {}) as LobbyOwnerFullEvent
      if (event.type !== 'lobby.owner.full' || typeof event.lobbyUuid !== 'string') {
        return
      }

      const dedupeKey = `${event.lobbyUuid}:${event.timestamp ?? 'no-ts'}:${event.currentPlayers ?? 'na'}:${event.maxPlayers ?? 'na'}`
      if (seenNotificationKeysRef.current.has(dedupeKey)) {
        return
      }
      seenNotificationKeysRef.current.add(dedupeKey)

      const lobbyName =
        typeof event.lobbyName === 'string' && event.lobbyName.trim().length > 0
          ? event.lobbyName
          : t('notifications.lobbyFallbackName')
      const currentPlayers =
        typeof event.currentPlayers === 'number' ? event.currentPlayers : undefined
      const maxPlayers = typeof event.maxPlayers === 'number' ? event.maxPlayers : undefined
      const playerName = event.triggeredBy?.nickName

      const description = playerName
        ? t('notifications.lobbyFullDescriptionWithPlayer', {
            lobbyName,
            playerName,
            current: currentPlayers ?? '?',
            max: maxPlayers ?? '?',
          })
        : t('notifications.lobbyFullDescription', {
            lobbyName,
            current: currentPlayers ?? '?',
            max: maxPlayers ?? '?',
          })

      toast.success(t('notifications.lobbyFullTitle', { lobbyName }), {
        description,
        action: {
          label: t('notifications.openLobby'),
          onClick: () => {
            router.visit(`/lobbies/${event.lobbyUuid}`)
          },
        },
      })
    }

    subscribeToUserNotifications(userUuid, handleEvent)
      .then((teardown) => {
        if (!isActive) {
          teardown()
          return
        }
        unsubscribe = teardown
      })
      .catch((error) => {
        console.debug('Failed to subscribe to user notifications:', error)
      })

    return () => {
      isActive = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [isConnected, subscribeToUserNotifications, t, userUuid])

  return null
}
