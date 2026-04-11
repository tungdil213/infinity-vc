import { useCallback, useEffect, useRef, useState } from 'react'

interface NotificationWindowAdapter {
  setTimeout(handler: () => void, timeout: number): number
  clearTimeout(timeoutId: number): void
}

interface NotificationTimeoutIdsRef {
  current: number[]
}

interface ScheduleGameNotificationOptions {
  message: string
  setNotifications: React.Dispatch<React.SetStateAction<string[]>>
  timeoutIdsRef: NotificationTimeoutIdsRef
  windowAdapter?: NotificationWindowAdapter
  timeoutMs?: number
}

interface ClearGameNotificationTimeoutsOptions {
  timeoutIdsRef: NotificationTimeoutIdsRef
  windowAdapter?: NotificationWindowAdapter
}

const DEFAULT_NOTIFICATION_TIMEOUT_MS = 5000

export function scheduleGameNotification(options: ScheduleGameNotificationOptions): number {
  const windowAdapter = options.windowAdapter ?? window

  options.setNotifications((currentNotifications) => [...currentNotifications, options.message])

  const timeoutId = windowAdapter.setTimeout(() => {
    options.setNotifications((currentNotifications) => currentNotifications.slice(1))
    options.timeoutIdsRef.current = options.timeoutIdsRef.current.filter(
      (currentTimeoutId) => currentTimeoutId !== timeoutId
    )
  }, options.timeoutMs ?? DEFAULT_NOTIFICATION_TIMEOUT_MS)

  options.timeoutIdsRef.current.push(timeoutId)

  return timeoutId
}

export function clearGameNotificationTimeouts(options: ClearGameNotificationTimeoutsOptions): void {
  const windowAdapter = options.windowAdapter ?? window

  options.timeoutIdsRef.current.forEach((timeoutId) => {
    windowAdapter.clearTimeout(timeoutId)
  })
  options.timeoutIdsRef.current = []
}

export function useGameNotifications(): {
  notifications: string[]
  addNotification: (message: string) => void
} {
  const [notifications, setNotifications] = useState<string[]>([])
  const timeoutIdsRef = useRef<number[]>([])

  useEffect(
    () => () => {
      clearGameNotificationTimeouts({ timeoutIdsRef })
    },
    []
  )

  const addNotification = useCallback((message: string) => {
    scheduleGameNotification({
      message,
      setNotifications,
      timeoutIdsRef,
    })
  }, [])

  return {
    notifications,
    addNotification,
  }
}
