import { useEffect } from 'react'

export type RefreshGameState = () => Promise<void>

export type SubscribeToGamePolling = (
  gameId: string,
  callback: (event: unknown) => void
) => Promise<() => void>

interface PollingWindowAdapter {
  setInterval(handler: () => void, timeout: number): number
  clearInterval(intervalId: number): void
  addEventListener(event: 'focus', handler: () => void): void
  removeEventListener(event: 'focus', handler: () => void): void
}

interface PollingDocumentAdapter {
  visibilityState: DocumentVisibilityState
  addEventListener(event: 'visibilitychange', handler: () => void): void
  removeEventListener(event: 'visibilitychange', handler: () => void): void
}

export function refreshGamePollingSafely(refreshGameState: RefreshGameState): void {
  refreshGameState().catch(() => undefined)
}

export async function subscribeToGamePolling(options: {
  gameId: string
  subscribeToGame: SubscribeToGamePolling
  refreshGameState: RefreshGameState
}): Promise<() => void> {
  return options.subscribeToGame(options.gameId, () => {
    refreshGamePollingSafely(options.refreshGameState)
  })
}

export function attachGamePollingBrowserLifecycle(options: {
  refreshGameState: RefreshGameState
  pollingIntervalMs: number
  windowAdapter?: PollingWindowAdapter
  documentAdapter?: PollingDocumentAdapter
}): () => void {
  const windowAdapter = options.windowAdapter ?? window
  const documentAdapter = options.documentAdapter ?? document

  const onFocus = () => {
    refreshGamePollingSafely(options.refreshGameState)
  }

  const onVisibilityChange = () => {
    if (documentAdapter.visibilityState === 'visible') {
      refreshGamePollingSafely(options.refreshGameState)
    }
  }

  const intervalId = windowAdapter.setInterval(() => {
    refreshGamePollingSafely(options.refreshGameState)
  }, options.pollingIntervalMs)

  windowAdapter.addEventListener('focus', onFocus)
  documentAdapter.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    windowAdapter.clearInterval(intervalId)
    windowAdapter.removeEventListener('focus', onFocus)
    documentAdapter.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

export function useGamePolling(options: {
  gameId: string
  isConnected: boolean
  pollingIntervalMs: number
  refreshGameState: RefreshGameState
  subscribeToGame: SubscribeToGamePolling
}): void {
  const { gameId, isConnected, pollingIntervalMs, refreshGameState, subscribeToGame } = options

  useEffect(() => {
    if (!isConnected) {
      return
    }

    let unsubscribe: (() => void) | null = null

    const subscribe = async () => {
      unsubscribe = await subscribeToGamePolling({
        gameId,
        subscribeToGame,
        refreshGameState,
      })
    }

    subscribe().catch(() => undefined)

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [gameId, isConnected, refreshGameState, subscribeToGame])

  useEffect(() => {
    if (!isConnected) {
      return
    }

    refreshGamePollingSafely(refreshGameState)
  }, [isConnected, refreshGameState])

  useEffect(() => {
    return attachGamePollingBrowserLifecycle({
      refreshGameState,
      pollingIntervalMs,
    })
  }, [pollingIntervalMs, refreshGameState])

  useEffect(() => {
    refreshGamePollingSafely(refreshGameState)
  }, [refreshGameState])
}
