import React, { useCallback, useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useLobbyDetail } from '../hooks/use_lobby_detail'
import { useLobbyLeaveGuard } from '../hooks/use_lobby_leave_guard'
import { Button } from '@infinity.dev/ui/primitives/button'
import { LobbyPlayersPanel } from '@infinity.dev/ui/components/lobby-players-panel'
import { LobbyHeaderPanel } from '@infinity.dev/ui/components/lobby-header-panel'
import { ConnectionStatusIndicator } from '@infinity.dev/ui/components/connection-status-indicator'
import { LobbyPasswordDialog } from '@infinity.dev/ui/components/lobby-password-dialog'

interface GameLobbyProps {
  lobbyUuid: string
  lobbyName: string
  lobbyDescription?: string
  hasPassword?: boolean
  currentUser: {
    uuid: string
    nickName: string
  }
}

export default function GameLobby({
  lobbyUuid,
  lobbyName,
  lobbyDescription,
  hasPassword = false,
  currentUser,
}: GameLobbyProps) {
  const { lobby, loading, error, leaveLobby, startGame, isServiceReady } = useLobbyDetail(lobbyUuid)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [isLeavingLobby, setIsLeavingLobby] = useState(false)
  const [isJoiningLobby, setIsJoiningLobby] = useState(false)
  const [passwordDialogError, setPasswordDialogError] = useState<string | null>(null)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const hasNavigatedToGame = useRef(false)
  const startedGameUuid = typeof lobby?.gameUuid === 'string' ? lobby.gameUuid : undefined

  const navigateToGame = useCallback((gameUuid: string) => {
    if (!gameUuid || hasNavigatedToGame.current) {
      return
    }

    hasNavigatedToGame.current = true
    setIsStartingGame(true)
    toast.success('Game is starting!')
    router.visit(`/games/${gameUuid}`)
  }, [])

  // Detect whether current user is in the lobby
  const isUserInLobby = lobby?.players?.some((player) => player.uuid === currentUser.uuid) || false
  const shouldKeepLobbySessionOnNavigation = Boolean(lobby?.isPrivate || lobby?.hasPassword)

  // Hook used to manage leave confirmation
  const { markAsLeaving } = useLobbyLeaveGuard({
    isInLobby: isUserInLobby,
    lobbyUuid,
    userUuid: currentUser.uuid,
    onLeaveLobby: leaveLobby,
    leaveOnNavigation: !shouldKeepLobbySessionOnNavigation,
  })

  const handleStartGame = async () => {
    if (!lobby?.canStart || !isServiceReady) return

    setIsStartingGame(true)
    try {
      const result = await startGame(currentUser.uuid)
      if (result.gameUuid) {
        // Redirect to game page after a short delay
        setTimeout(() => {
          navigateToGame(result.gameUuid)
        }, 2000)
      }
    } catch (error) {
      toast.error('Failed to start game')
      setIsStartingGame(false)
    }
  }

  // Robust fallback: redirect driven by synchronized real-time lobby status.
  useEffect(() => {
    if (lobby?.status === 'IN_GAME' && startedGameUuid) {
      navigateToGame(startedGameUuid)
    }
  }, [lobby?.status, startedGameUuid, navigateToGame])

  const handleLeaveLobby = async () => {
    if (!isServiceReady) return

    setIsLeavingLobby(true)
    // Mark as explicit leave to avoid confirmation prompt
    markAsLeaving()

    try {
      await leaveLobby(currentUser.uuid)
      toast.success('Left lobby successfully')
      router.visit('/lobbies')
    } catch {
      toast.error('Failed to leave lobby')
    } finally {
      setIsLeavingLobby(false)
    }
  }

  const handleJoinLobby = async () => {
    const lobbyIsProtected = Boolean(lobby?.hasPassword ?? hasPassword)

    if (lobbyIsProtected) {
      setPasswordDialogError(null)
      setIsPasswordDialogOpen(true)
      return
    }

    await submitJoinLobby()
  }

  const buildJsonHeaders = () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (csrfToken) {
      headers['X-CSRF-TOKEN'] = csrfToken
    }
    return headers
  }

  const submitJoinLobby = async (password?: string) => {
    setIsJoiningLobby(true)
    try {
      const response = await fetch(`/api/v1/lobbies/${lobbyUuid}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: buildJsonHeaders(),
        body: JSON.stringify(password ? { password } : {}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === 'string' ? payload.error : 'Unable to join lobby'
        if (isPasswordDialogOpen) {
          setPasswordDialogError(errorMessage)
          return
        }
        throw new Error(errorMessage)
      }

      setIsPasswordDialogOpen(false)
      setPasswordDialogError(null)
      toast.success('Successfully joined lobby')
      router.reload()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      if (isPasswordDialogOpen) {
        setPasswordDialogError(errorMessage)
        return
      }
      toast.error(errorMessage)
    } finally {
      setIsJoiningLobby(false)
    }
  }

  const handleSubmitPassword = async (password: string) => {
    await submitJoinLobby(password)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !lobby) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading lobby</h3>
              <div className="mt-2 text-sm text-red-700">{error || 'Lobby not found'}</div>
              <div className="mt-4">
                <Button onClick={() => router.visit('/lobbies')} variant="neutral" size="sm">
                  Back to Lobbies
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isCreator = currentUser.uuid === lobby.createdBy
  const canJoinLobby = !isUserInLobby && lobby.hasAvailableSlots && !isJoiningLobby
  const canStartGame = isCreator && lobby.canStart && !isStartingGame

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Connection Status */}
      <div className="mb-4">
        <ConnectionStatusIndicator isConnected={!!isServiceReady} />
      </div>

      {/* Lobby Header */}
      <LobbyHeaderPanel
        name={lobby.name || lobbyName}
        description={lobby.description || lobbyDescription}
        status={lobby.status}
        currentPlayers={lobby.currentPlayers}
        maxPlayers={lobby.maxPlayers}
        isPrivate={lobby.isPrivate}
        hasPassword={Boolean(lobby.hasPassword ?? hasPassword)}
        isUserInLobby={isUserInLobby}
        canJoinLobby={canJoinLobby}
        canStartGame={canStartGame}
        isJoiningLobby={isJoiningLobby}
        isStartingGame={isStartingGame}
        isLeavingLobby={isLeavingLobby}
        onJoinLobby={handleJoinLobby}
        onStartGame={handleStartGame}
        onLeaveLobby={handleLeaveLobby}
      />

      {/* Players List */}
      <LobbyPlayersPanel
        players={lobby.players || []}
        currentUserUuid={currentUser.uuid}
        creatorUuid={lobby.createdBy}
        maxPlayers={lobby.maxPlayers}
        currentPlayers={lobby.currentPlayers}
        hasAvailableSlots={lobby.hasAvailableSlots}
        createdAt={lobby.createdAt}
      />

      <LobbyPasswordDialog
        open={isPasswordDialogOpen}
        lobbyName={lobby?.name || lobbyName}
        loading={isJoiningLobby}
        error={passwordDialogError}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open)
          if (!open) {
            setPasswordDialogError(null)
          }
        }}
        onSubmit={handleSubmitPassword}
      />
    </div>
  )
}
