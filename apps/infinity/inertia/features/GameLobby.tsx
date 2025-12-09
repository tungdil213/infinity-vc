import React, { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useLobbyDetail } from '../hooks/use_lobby_detail'
import { useLobbyLeaveGuard } from '../hooks/use_lobby_leave_guard'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Badge } from '@tyfo.dev/ui/primitives/badge'
import { Users } from 'lucide-react'
import { LobbyPlayersPanel } from '@tyfo.dev/ui/components/lobby-players-panel'
import { LobbyHeaderPanel } from '@tyfo.dev/ui/components/lobby-header-panel'
import { ConnectionStatusIndicator } from '@tyfo.dev/ui/components/connection-status-indicator'
import { useTransmit } from '../contexts/TransmitContext'

interface Player {
  uuid: string
  nickName: string
}

interface GameLobbyProps {
  lobbyUuid: string
  currentUser: {
    uuid: string
    nickName: string
  }
}

export default function GameLobby({ lobbyUuid, currentUser }: GameLobbyProps) {
  const { lobby, loading, error, leaveLobby, startGame, isServiceReady } = useLobbyDetail(lobbyUuid)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [isLeavingLobby, setIsLeavingLobby] = useState(false)
  const [isJoiningLobby, setIsJoiningLobby] = useState(false)
  const { subscribeToLobby, isConnected } = useTransmit()

  // Détecter si l'utilisateur est dans le lobby
  const isUserInLobby = lobby?.players?.some(player => player.uuid === currentUser.uuid) || false

  // Hook pour gérer la confirmation de sortie
  const { markAsLeaving } = useLobbyLeaveGuard({
    isInLobby: isUserInLobby,
    lobbyUuid,
    userUuid: currentUser.uuid,
    onLeaveLobby: leaveLobby,
  })

  const handleStartGame = async () => {
    if (!lobby?.canStart || !isServiceReady) return
    
    setIsStartingGame(true)
    try {
      const result = await startGame(currentUser.uuid)
      if (result.gameUuid) {
        toast.success('Game is starting!')
        // Redirect to game page after a short delay
        setTimeout(() => {
          router.visit(`/games/${result.gameUuid}`)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to start game:', error)
      toast.error('Failed to start game')
      setIsStartingGame(false)
    }
  }

  // Écouter les événements temps réel du lobby pour détecter le démarrage de la partie
  useEffect(() => {
    if (!isConnected) return

    let unsubscribe: (() => void) | null = null

    const subscribe = async () => {
      unsubscribe = await subscribeToLobby(lobbyUuid, (event) => {
        if (event.type === 'lobby.game.started' && event.lobbyUuid === lobbyUuid && event.gameUuid) {
          setIsStartingGame(true)
          toast.success('Game is starting!')
          router.visit(`/games/${event.gameUuid}`)
        }
      })
    }

    subscribe().catch((err) => {
      console.error('Failed to subscribe to lobby game events:', err)
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [lobbyUuid, subscribeToLobby, isConnected])

  const handleLeaveLobby = async () => {
    if (!isServiceReady) return
    
    setIsLeavingLobby(true)
    // Marquer qu'on quitte volontairement pour éviter la confirmation
    markAsLeaving()
    
    try {
      await leaveLobby(currentUser.uuid)
      toast.success('Left lobby successfully')
      router.visit('/lobbies')
    } catch (error) {
      console.error('Failed to leave lobby:', error)
      toast.error('Failed to leave lobby')
    } finally {
      setIsLeavingLobby(false)
    }
  }

  const handleJoinLobby = async () => {
    setIsJoiningLobby(true)
    try {
      router.post(`/lobbies/${lobbyUuid}/join`, {}, {
        onSuccess: () => {
          toast.success('Vous avez rejoint le lobby avec succès!')
          // Reload the page to update the lobby state
          router.reload()
        },
        onError: (errors) => {
          const errorMessage = typeof errors === 'object' && errors !== null && 'error' in errors 
            ? (errors as any).error 
            : 'Impossible de rejoindre le lobby'
          toast.error(errorMessage)
        }
      })
    } catch (error) {
      toast.error('Une erreur est survenue')
    } finally {
      setIsJoiningLobby(false)
    }
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
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading lobby</h3>
              <div className="mt-2 text-sm text-red-700">{error || 'Lobby not found'}</div>
              <div className="mt-4">
                <Button onClick={() => router.visit('/lobbies')} variant="outline" size="sm">
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
        name={lobby.name}
        status={lobby.status}
        currentPlayers={lobby.currentPlayers}
        maxPlayers={lobby.maxPlayers}
        isPrivate={lobby.isPrivate}
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
    </div>
  )
}
