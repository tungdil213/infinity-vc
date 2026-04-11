import { test } from '@japa/runner'
import {
  clearGameNotificationTimeouts,
  scheduleGameNotification,
} from '../../../inertia/hooks/use_game_notifications.js'

class WindowAdapterDouble {
  nextTimeoutId = 1
  timeoutHandlers = new Map<number, () => void>()
  timeoutDelays = new Map<number, number>()
  clearedTimeoutIds: number[] = []

  setTimeout(handler: () => void, timeout: number): number {
    const timeoutId = this.nextTimeoutId
    this.nextTimeoutId += 1
    this.timeoutHandlers.set(timeoutId, handler)
    this.timeoutDelays.set(timeoutId, timeout)
    return timeoutId
  }

  clearTimeout(timeoutId: number): void {
    this.clearedTimeoutIds.push(timeoutId)
  }
}

function createNotificationsStateController() {
  let notifications: string[] = []

  return {
    getNotifications(): string[] {
      return notifications
    },
    setNotifications(
      nextNotifications: string[] | ((currentNotifications: string[]) => string[])
    ): void {
      notifications =
        typeof nextNotifications === 'function'
          ? nextNotifications(notifications)
          : nextNotifications
    },
  }
}

test.group('use_game_notifications', () => {
  test('scheduleGameNotification appends a notification and removes it after the timeout', ({
    assert,
  }) => {
    const stateController = createNotificationsStateController()
    const timeoutIdsRef = { current: [] as number[] }
    const windowAdapter = new WindowAdapterDouble()

    const timeoutId = scheduleGameNotification({
      message: 'Card drawn!',
      setNotifications: stateController.setNotifications,
      timeoutIdsRef,
      windowAdapter,
    })

    assert.deepEqual(stateController.getNotifications(), ['Card drawn!'])
    assert.deepEqual(timeoutIdsRef.current, [timeoutId])
    assert.equal(windowAdapter.timeoutDelays.get(timeoutId), 5000)

    windowAdapter.timeoutHandlers.get(timeoutId)?.()

    assert.deepEqual(stateController.getNotifications(), [])
    assert.deepEqual(timeoutIdsRef.current, [])
  })

  test('scheduleGameNotification preserves the existing FIFO dismissal behavior', ({ assert }) => {
    const stateController = createNotificationsStateController()
    const timeoutIdsRef = { current: [] as number[] }
    const windowAdapter = new WindowAdapterDouble()

    const firstTimeoutId = scheduleGameNotification({
      message: 'First',
      setNotifications: stateController.setNotifications,
      timeoutIdsRef,
      windowAdapter,
    })
    const secondTimeoutId = scheduleGameNotification({
      message: 'Second',
      setNotifications: stateController.setNotifications,
      timeoutIdsRef,
      windowAdapter,
    })

    assert.deepEqual(stateController.getNotifications(), ['First', 'Second'])

    windowAdapter.timeoutHandlers.get(firstTimeoutId)?.()
    assert.deepEqual(stateController.getNotifications(), ['Second'])
    assert.deepEqual(timeoutIdsRef.current, [secondTimeoutId])

    windowAdapter.timeoutHandlers.get(secondTimeoutId)?.()
    assert.deepEqual(stateController.getNotifications(), [])
    assert.deepEqual(timeoutIdsRef.current, [])
  })

  test('clearGameNotificationTimeouts clears every pending timeout and resets the ref', ({
    assert,
  }) => {
    const timeoutIdsRef = { current: [11, 22, 33] }
    const windowAdapter = new WindowAdapterDouble()

    clearGameNotificationTimeouts({
      timeoutIdsRef,
      windowAdapter,
    })

    assert.deepEqual(windowAdapter.clearedTimeoutIds, [11, 22, 33])
    assert.deepEqual(timeoutIdsRef.current, [])
  })
})
