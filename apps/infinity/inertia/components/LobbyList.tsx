import React, { useState } from 'react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tyfo.dev/ui/primitives/card'
import { Badge } from '@tyfo.dev/ui/primitives/badge'
import { Users, Lock, Play, Plus, RefreshCw } from 'lucide-react'
import { router } from '@inertiajs/react'
import { useLobbyList } from '../hooks/use_lobby_list'
import { toast } from 'sonner'

interface Player {
  uuid: string
  nickName: string
}

interface Lobby {
  uuid: string
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  players: Player[]
  createdAt: string
}

interface LobbyListProps {
  currentUser?: {
    uuid: string
    fullName: string
  }
  onCreateLobby?: () => void
  initialLobbies?: Lobby[]
}

export default function LobbyList({ currentUser, onCreateLobby, initialLobbies }: LobbyListProps) {
  const { lobbies, loading, error, refresh, joinLobby: joinLobbyService } = useLobbyList()
  const [joiningLobby, setJoiningLobby] = useState<string | null>(null)

  // Si on a des données initiales et qu'on est encore en loading, utiliser les données initiales
  const displayLobbies = loading && initialLobbies ? initialLobbies : lobbies
  const isLoading = loading && !initialLobbies

  const handleJoinLobby = async (lobbyUuid: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to join a lobby')
      return
    }

    // Service is always ready with the new hook implementation

    try {
      setJoiningLobby(lobbyUuid)
      await joinLobbyService(lobbyUuid, currentUser.uuid)
      
      // Navigate to the lobby page
      router.visit(`/lobbies/${lobbyUuid}`)
      toast.success('Successfully joined lobby!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join lobby'
      toast.error(errorMessage)
    } finally {
      setJoiningLobby(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-100 text-green-800'
      case 'FULL':
        return 'bg-yellow-100 text-yellow-800'
      case 'WAITING':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading lobbies</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <Button onClick={refresh} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Connection Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-green-500`} />
          <span className="text-sm text-gray-600">
            Connected
          </span>
        </div>
        
        <Button onClick={refresh} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Lobbies</h1>
        <p className="text-gray-600">Join an existing lobby or create your own to start playing!</p>
      </div>

      {/* Lobbies Grid */}
      {displayLobbies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Users className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lobbies available</h3>
          <p className="text-gray-600 mb-4">Be the first to create a lobby and start playing!</p>
          {onCreateLobby && (
            <Button onClick={onCreateLobby} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create First Lobby
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayLobbies.map((lobby) => (
            <Card key={lobby.uuid} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{lobby.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusColor(lobby.status)}>
                        {lobby.status}
                      </Badge>
                      {lobby.isPrivate && (
                        <Badge variant="secondary">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                      {currentUser?.uuid && lobby.createdBy === currentUser.uuid && (
                        <Badge variant="outline">Owner</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      <Users className="w-4 h-4 inline mr-1" />
                      {lobby.currentPlayers}/{lobby.maxPlayers}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Players Preview */}
                {lobby.players && lobby.players.length > 0 && (
                  <div className="mb-4">
                    <div className="flex -space-x-2 mb-2">
                      {lobby.players.slice(0, 4).map((player) => (
                        <div
                          key={player.uuid}
                          className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white text-xs font-medium text-gray-700"
                          title={player.nickName}
                        >
                          {player.nickName.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {lobby.players.length > 4 && (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center border-2 border-white text-xs text-gray-600">
                          +{lobby.players.length - 4}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      {lobby.players.slice(0, 2).map(p => p.nickName).join(', ')}
                      {lobby.players.length > 2 && ` and ${lobby.players.length - 2} more`}
                    </div>
                  </div>
                )}

                {/* Lobby Info */}
                <CardDescription className="mb-4">
                  Created {new Date(lobby.createdAt).toLocaleDateString()} at{' '}
                  {new Date(lobby.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </CardDescription>

                {/* Actions */}
                <div className="flex gap-2">
                  {lobby.hasAvailableSlots ? (
                    <Button
                      onClick={() => handleJoinLobby(lobby.uuid)}
                      disabled={joiningLobby === lobby.uuid || !currentUser}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {joiningLobby === lobby.uuid ? 'Joining...' : 'Join Lobby'}
                    </Button>
                  ) : (
                    <Button disabled className="flex-1">
                      Lobby Full
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => router.visit(`/lobbies/${lobby.uuid}`)}
                    className="px-3"
                    title="View lobby details"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
