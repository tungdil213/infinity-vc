import { router } from '@inertiajs/react'
import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/use_i18n'

interface UseLobbyLeaveGuardOptions {
  isInLobby: boolean
  lobbyUuid?: string
  userUuid?: string
  onLeaveLobby?: (userUuid: string) => Promise<void>
}

const HEARTBEAT_INTERVAL_MS = 5_000

const createClientSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `lobby-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeVisitHref = (rawUrl: unknown): string | null => {
  if (typeof rawUrl === 'string') {
    return rawUrl
  }

  if (rawUrl && typeof rawUrl === 'object') {
    const href = (rawUrl as { href?: unknown }).href
    if (typeof href === 'string') {
      return href
    }

    const rawToString = (rawUrl as { toString?: () => string }).toString
    if (typeof rawToString === 'function') {
      const fromToString = rawToString.call(rawUrl)
      if (typeof fromToString === 'string' && fromToString.length > 0) {
        return fromToString
      }
    }
  }

  return null
}

const normalizeVisitPath = (rawUrl: unknown): string | null => {
  const href = normalizeVisitHref(rawUrl)
  if (!href) {
    return null
  }

  try {
    return new URL(href, window.location.origin).pathname
  } catch {
    return null
  }
}

const isLobbyDetailPath = (pathname: string): boolean => {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 2 || segments[0] !== 'lobbies') {
    return false
  }

  const reservedPaths = new Set(['create', 'join'])
  return !reservedPaths.has(segments[1])
}

/**
 * Handles robust lobby leave behavior on tab close/navigation.
 */
export function useLobbyLeaveGuard({
  isInLobby,
  lobbyUuid,
  userUuid,
  onLeaveLobby,
}: UseLobbyLeaveGuardOptions) {
  const { t } = useI18n()
  const isLeavingRef = useRef(false)
  const clientSessionIdRef = useRef<string>(createClientSessionId())

  useEffect(() => {
    if (!isInLobby || !lobbyUuid || !userUuid || !onLeaveLobby) {
      return
    }

    let heartbeatIntervalId: number | undefined

    const getCsrfToken = () =>
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? undefined

    const sendHeartbeat = async () => {
      if (isLeavingRef.current) {
        return
      }

      const csrfToken = getCsrfToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      try {
        await fetch(`/api/v1/lobbies/${lobbyUuid}/heartbeat`, {
          method: 'POST',
          headers,
          credentials: 'include',
          keepalive: true,
          body: JSON.stringify({
            lobbyUuid,
            userUuid,
            clientSessionId: clientSessionIdRef.current,
            _csrf: csrfToken,
          }),
        })
      } catch (error) {
        console.debug('Lobby heartbeat failed:', error)
      }
    }

    const sendLeaveBeacon = () => {
      const csrfToken = getCsrfToken()
      const payload = {
        lobbyUuid,
        userUuid,
        clientSessionId: clientSessionIdRef.current,
        _csrf: csrfToken,
      }

      const requestBody = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      })

      const beaconAccepted = navigator.sendBeacon('/api/v1/lobbies/leave-on-close', requestBody)
      if (beaconAccepted) {
        return
      }

      fetch('/api/v1/lobbies/leave-on-close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify(payload),
      }).catch((error) => {
        console.debug('Fallback leave-on-close request failed:', error)
      })
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isLeavingRef.current) {
        return
      }

      // Show browser leave confirmation
      event.preventDefault()
      event.returnValue = t('guard.leaveLobbyConfirm')
      return event.returnValue
    }

    const handlePageHide = () => {
      if (isLeavingRef.current) {
        return
      }

      try {
        isLeavingRef.current = true
        sendLeaveBeacon()
      } catch (error) {
        console.error('Error while auto-leaving lobby on page hide:', error)
      }
    }

    // Handle Inertia navigation transitions before they start.
    const handleInertiaBefore = (event: any) => {
      if (isLeavingRef.current) {
        return
      }

      const url = event.detail.visit.url
      const currentPath = window.location.pathname
      const nextPath = normalizeVisitPath(url)
      const nextHref = normalizeVisitHref(url)
      if (!nextPath || !nextHref) {
        return
      }

      const isLeavingLobbyDetail =
        isLobbyDetailPath(currentPath) &&
        !isLobbyDetailPath(nextPath) &&
        !nextPath.startsWith('/games/')

      if (isLeavingLobbyDetail) {
        const shouldLeave = window.confirm(t('guard.leaveLobbyConfirm'))

        if (!shouldLeave) {
          event.preventDefault()
          return
        }

        event.preventDefault()

        // Mark as intentionally leaving to prevent duplicate requests
        isLeavingRef.current = true

        // Leave lobby before navigation to avoid ghost lobbies.
        onLeaveLobby(userUuid)
          .catch((error) => {
            console.error(t('guard.leaveLobbyError'), error)
            sendLeaveBeacon()
          })
          .finally(() => {
            router.visit(nextHref)
          })
      }
    }

    sendHeartbeat()
    heartbeatIntervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    // Register listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('inertia:before', handleInertiaBefore)

    // Cleanup
    return () => {
      if (heartbeatIntervalId !== undefined) {
        window.clearInterval(heartbeatIntervalId)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('inertia:before', handleInertiaBefore)
    }
  }, [isInLobby, lobbyUuid, userUuid, onLeaveLobby, t])

  // Mark explicit leave to skip confirmation dialogs
  const markAsLeaving = () => {
    isLeavingRef.current = true
  }

  return { markAsLeaving }
}
