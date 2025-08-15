import React, { useState, useEffect } from 'react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@tyfo.dev/ui/primitives/card'
import { Badge } from '@tyfo.dev/ui/primitives/badge'
import { Users, Plus, Lock, Globe, Play, Crown } from 'lucide-react'
import { useSSEContext, SSEEvent } from '../contexts/SSEContext'

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
  availableActions: string[]
  createdAt: string
}

interface LobbyListProps {
  initialLobbies: Lobby[]
  currentUser: {
    uuid: string
    nickName: string
  }
  onCreateLobby: () => void
  onJoinLobby: (lobbyUuid: string) => void
}

export default function LobbyList({ initialLobbies, currentUser, onCreateLobby, onJoinLobby }: LobbyListProps) {
  const [lobbies, setLobbies] = useState<Lobby[]>(initialLobbies)
  const [notifications, setNotifications] = useState<string[]>([])
  const [joiningLobby, setJoiningLobby] = useState<string | null>(null)
  const { subscribeToChannel, addEventListener, removeEventListener, isConnected } = useSSEContext()

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message])
    setTimeout(() => {
      setNotifications(prev => prev.slice(1))
    }, 5000)
  }

  const handleSSEEvent = (event: SSEEvent) => {
    console.log('Received SSE event in lobby list:', event)

    switch (event.type) {
      case 'lobby.created':
        setLobbies(prev => [...prev, event.data.lobby])
        addNotification(`New lobby "${event.data.lobby.name}" created`)
        break

      case 'lobby.player.joined':
        setLobbies(prev => prev.map(lobby => 
          lobby.uuid === event.data.lobbyUuid
            ? {
                ...lobby,
                players: [...lobby.players, event.data.player],
                currentPlayers: event.data.playerCount,
                status: event.data.lobbyStatus,
                hasAvailableSlots: event.data.playerCount < lobby.maxPlayers,
                canStart: event.data.playerCount >= 2,
              }
            : lobby
        ))
        break

      case 'lobby.player.left':
        setLobbies(prev => prev.map(lobby => 
          lobby.uuid === event.data.lobbyUuid
            ? {
                ...lobby,
                players: lobby.players.filter(p => p.uuid !== event.data.player.uuid),
                currentPlayers: event.data.playerCount,
                status: event.data.lobbyStatus,
                hasAvailableSlots: event.data.playerCount < lobby.maxPlayers,
                canStart: event.data.playerCount >= 2,
              }
            : lobby
        ))
        break

      case 'lobby.game.started':
        // Remove lobby from list when game starts
        setLobbies(prev => prev.filter(lobby => lobby.uuid !== event.data.lobbyUuid))
        addNotification(`Game started in lobby "${event.data.lobbyName}"`)
        break

      case 'lobby.deleted':
        setLobbies(prev => prev.filter(lobby => lobby.uuid !== event.data.lobbyUuid))
        addNotification(`Lobby "${event.data.lobbyName}" was deleted`)
        break

      default:
        console.log('Unhandled SSE event type in lobby list:', event.type)
    }
  }

  const handleJoinLobby = async (lobbyUuid: string) => {
    setJoiningLobby(lobbyUuid)
    try {
      await onJoinLobby(lobbyUuid)
    } catch (error) {
      console.error('Failed to join lobby:', error)
      addNotification('Failed to join lobby')
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

  useEffect(() => {
    // Subscribe to lobby list channel for general lobby events
    subscribeToChannel('lobby.list')
    
    // Subscribe to individual lobby channels for detailed updates
    lobbies.forEach(lobby => {
      subscribeToChannel(`lobby.${lobby.uuid}`)
    })

    // Add event listeners
    addEventListener('lobby.created', handleSSEEvent)
    addEventListener('lobby.updated', handleSSEEvent)
    addEventListener('lobby.deleted', handleSSEEvent)
    addEventListener('lobby.player.joined', handleSSEEvent)
    addEventListener('lobby.player.left', handleSSEEvent)

    return () => {
      // Remove event listeners
      removeEventListener('lobby.created', handleSSEEvent)
      removeEventListener('lobby.updated', handleSSEEvent)
      removeEventListener('lobby.deleted', handleSSEEvent)
      removeEventListener('lobby.player.joined', handleSSEEvent)
      removeEventListener('lobby.player.left', handleSSEEvent)
    }
  }, [lobbies])

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Connection Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <Button onClick={onCreateLobby} className="bg-blue-600 hover:bg-blue-700">
          Create New Lobby
        </Button>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-4 space-y-2">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-2 rounded"
            >
              {notification}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Lobbies</h1>
        <p className="text-gray-600">Join an existing lobby or create your own to start playing!</p>
      </div>

      {/* Lobbies Grid */}
      {lobbies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lobbies available</h3>
          <p className="text-gray-600 mb-4">Be the first to create a lobby and start playing!</p>
          <Button onClick={onCreateLobby} className="bg-blue-600 hover:bg-blue-700">
            Create First Lobby
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lobbies.map((lobby) => (
            <div key={lobby.uuid} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              {/* Lobby Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{lobby.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lobby.status)}`}>
                      {lobby.status}
                    </span>
                    {lobby.isPrivate && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        Private
                      </span>
                    )}
                    {lobby.createdBy === currentUser.uuid && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        Owner
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {lobby.players?.length || 0}/{lobby.maxPlayers}
                  </div>
                  <div className="text-xs text-gray-500">players</div>
                </div>
              </div>

              {/* Players Preview */}
              <div className="mb-4">
                <div className="flex -space-x-2 mb-2">
                  {lobby.players.slice(0, 4).map((player, index) => (
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
                
                {lobby.players.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {lobby.players.slice(0, 2).map(p => p.nickName).join(', ')}
                    {lobby.players.length > 2 && ` and ${lobby.players.length - 2} more`}
                  </div>
                )}
              </div>

              {/* Lobby Info */}
              <div className="text-xs text-gray-500 mb-4">
                Created {new Date(lobby.createdAt).toLocaleDateString()} at{' '}
                {new Date(lobby.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {(lobby.players?.length || 0) < lobby.maxPlayers ? (
                  <Button
                    onClick={() => handleJoinLobby(lobby.uuid)}
                    disabled={joiningLobby === lobby.uuid}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {joiningLobby === lobby.uuid ? 'Joining...' : 'Join Lobby'}
                  </Button>
                ) : (
                  <Button disabled className="flex-1 bg-gray-400 cursor-not-allowed">
                    Lobby Full
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="px-3"
                  title="View lobby details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
