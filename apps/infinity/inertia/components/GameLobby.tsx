import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useLobbyDetails } from '../hooks/use_lobby_details'
import { useLobbyLeaveGuard } from '../hooks/use_lobby_leave_guard'
import { Card, CardContent, CardHeader, CardTitle } from '@tyfo.dev/ui/primitives/card'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Badge } from '@tyfo.dev/ui/primitives/badge'
import { Avatar, AvatarFallback } from '@tyfo.dev/ui/primitives/avatar'
import { Users, Crown, Play, UserMinus, Settings, Share2, LogOut, UserPlus } from 'lucide-react'

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
  const { lobby, loading, error, leaveLobby, startGame } = useLobbyDetails(lobbyUuid)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [isLeavingLobby, setIsLeavingLobby] = useState(false)
  const [isJoiningLobby, setIsJoiningLobby] = useState(false)

  // Logs de debug pour comprendre l'état du lobby
  console.log('🎮 GameLobby: Rendering', {
    lobbyUuid,
    hasLobby: !!lobby,
    currentPlayers: lobby?.currentPlayers,
    playersArrayLength: lobby?.players?.length,
    playersUuids: lobby?.players?.map((p) => p.uuid),
    playersNames: lobby?.players?.map((p) => p.nickName),
    loading,
    error,
  })

  // Détecter si l'utilisateur est dans le lobby
  const isUserInLobby = lobby?.players?.some((player) => player.uuid === currentUser.uuid) || false

  console.log('🎮 GameLobby: User check', {
    currentUserUuid: currentUser.uuid,
    isUserInLobby,
    playersInLobby: lobby?.players?.length,
  })

  // Hook pour gérer la confirmation de sortie
  const { markAsLeaving } = useLobbyLeaveGuard({
    isInLobby: isUserInLobby,
    lobbyUuid,
    userUuid: currentUser.uuid,
    onLeaveLobby: leaveLobby,
  })

  const handleStartGame = async () => {
    if (!lobby?.canStart) return

    setIsStartingGame(true)
    try {
      const result = await startGame(currentUser.uuid)
      if (result.gameUuid) {
        toast.success('Game is starting!')
        // Redirect to game page after a short delay
        setTimeout(() => {
          router.visit(`/game/${result.gameUuid}`)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to start game:', error)
      toast.error('Failed to start game')
      setIsStartingGame(false)
    }
  }

  const handleLeaveLobby = async () => {
    // Service is always ready with the new hook implementation

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
      router.post(
        `/lobbies/${lobbyUuid}/join`,
        {},
        {
          onSuccess: () => {
            toast.success('Vous avez rejoint le lobby avec succès!')
            // Reload the page to update the lobby state
            router.reload()
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? (errors as any).error
                : 'Impossible de rejoindre le lobby'
            toast.error(errorMessage)
          },
        }
      )
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
      <div className="mb-4 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full bg-green-500`} />
        <span className="text-sm text-gray-600">Connected</span>
      </div>

      {/* Lobby Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{lobby.name}</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge
                  className={
                    lobby.status === 'READY'
                      ? 'bg-green-100 text-green-800'
                      : lobby.status === 'FULL'
                        ? 'bg-yellow-100 text-yellow-800'
                        : lobby.status === 'WAITING'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                  }
                >
                  {lobby.status}
                </Badge>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {lobby.currentPlayers}/{lobby.maxPlayers} players
                </span>
                {lobby.isPrivate && <Badge variant="secondary">Private</Badge>}
              </div>
            </div>

            <div className="flex gap-2">
              {canJoinLobby && (
                <Button
                  onClick={handleJoinLobby}
                  disabled={isJoiningLobby}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isJoiningLobby ? 'Joining...' : 'Join Lobby'}
                </Button>
              )}

              {canStartGame && (
                <Button
                  onClick={handleStartGame}
                  disabled={isStartingGame}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isStartingGame ? 'Starting...' : 'Start Game'}
                </Button>
              )}

              {isUserInLobby && (
                <Button
                  onClick={handleLeaveLobby}
                  disabled={isLeavingLobby}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLeavingLobby ? 'Leaving...' : 'Leave Lobby'}
                </Button>
              )}
            </div>
          </div>

          {/* Game Starting Overlay */}
          {isStartingGame && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
                <span className="text-green-800 font-medium">Game is starting...</span>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Players List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lobby.players?.map((player) => (
              <div
                key={player.uuid}
                className={`p-4 rounded-lg border ${
                  player.uuid === currentUser.uuid
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{player.nickName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {player.uuid === lobby.createdBy && (
                        <Badge variant="outline" className="text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Creator
                        </Badge>
                      )}
                      {player.uuid === currentUser.uuid && (
                        <Badge className="text-xs bg-blue-100 text-blue-800">You</Badge>
                      )}
                    </div>
                  </div>

                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {player.nickName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: lobby.maxPlayers - lobby.currentPlayers }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
              >
                <span className="text-gray-500 text-sm">Waiting for player...</span>
              </div>
            ))}
          </div>

          {/* Lobby Info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Created: {new Date(lobby.createdAt).toLocaleString()}</span>
              <span>
                {lobby.hasAvailableSlots ? 'Open for new players' : 'Lobby is full'}
                {/* Debug info - remove in production */}
                <span className="text-xs text-gray-400 ml-2">
                  (Debug: {lobby.currentPlayers}/{lobby.maxPlayers}, hasSlots:{' '}
                  {lobby.hasAvailableSlots ? 'true' : 'false'})
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
