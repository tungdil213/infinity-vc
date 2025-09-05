import React, { useState, useEffect } from 'react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { useTransmit, TransmitEvent } from '../contexts/TransmitContext'

interface Player {
  uuid: string
  nickName: string
}

interface Lobby {
  uuid: string
  name: string
  description?: string
  status: string
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasPassword: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  players: Player[]
  availableActions: string[]
  createdAt: string
  invitationCode?: string
}

interface EnhancedGameLobbyProps {
  lobby: Lobby
  currentUser: {
    uuid: string
    nickName: string
  }
  onLeaveLobby: () => void
  onStartGame: () => void
}

export default function EnhancedGameLobby({ 
  lobby: initialLobby, 
  currentUser, 
  onLeaveLobby, 
  onStartGame
}: EnhancedGameLobbyProps) {
  const [lobby, setLobby] = useState<Lobby>(initialLobby)
  const [notifications, setNotifications] = useState<string[]>([])
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  const { isConnected, addEventListener, removeEventListener } = useTransmit()

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message])
    setTimeout(() => {
      setNotifications(prev => prev.slice(1))
    }, 5000)
  }

  const handleTransmitEvent = (event: TransmitEvent) => {
    console.log('Received SSE event:', event)

    switch (event.type) {
      case 'lobby.player.joined':
        if (event.data.lobbyUuid === lobby.uuid) {
          setLobby(prev => ({
            ...prev,
            players: [...prev.players, event.data.player],
            currentPlayers: event.data.playerCount,
            status: event.data.lobbyStatus,
            hasAvailableSlots: event.data.playerCount < prev.maxPlayers,
            canStart: event.data.playerCount >= 2,
          }))
          
          if (event.data.player.uuid !== currentUser.uuid) {
            addNotification(`${event.data.player.nickName} joined the lobby`)
          }
        }
        break

      case 'lobby.player.left':
        if (event.data.lobbyUuid === lobby.uuid) {
          setLobby(prev => ({
            ...prev,
            players: prev.players.filter(p => p.uuid !== event.data.player.uuid),
            currentPlayers: event.data.playerCount,
            status: event.data.lobbyStatus,
            hasAvailableSlots: event.data.playerCount < prev.maxPlayers,
            canStart: event.data.playerCount >= 2,
          }))
          
          if (event.data.player.uuid !== currentUser.uuid) {
            addNotification(`${event.data.player.nickName} left the lobby`)
          }
        }
        break

      case 'lobby.game.started':
        if (event.data.lobbyUuid === lobby.uuid) {
          setIsStartingGame(true)
          addNotification('Game is starting!')
          
          setTimeout(() => {
            window.location.href = `/games/${event.data.gameUuid}`
          }, 2000)
        }
        break

      default:
        console.log('Unhandled SSE event type:', event.type)
    }
  }

  const handleStartGame = async () => {
    if (!lobby.canStart) return
    
    setIsStartingGame(true)
    try {
      await onStartGame()
    } catch (error) {
      console.error('Failed to start game:', error)
      addNotification('Failed to start game')
      setIsStartingGame(false)
    }
  }

  const handleLeaveLobby = async () => {
    try {
      await onLeaveLobby()
    } catch (error) {
      console.error('Failed to leave lobby:', error)
      addNotification('Failed to leave lobby')
    }
  }

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/lobbies/join/${lobby.invitationCode || lobby.uuid}`
    
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedInvite(true)
      setTimeout(() => setCopiedInvite(false), 2000)
    } catch (error) {
      console.error('Failed to copy invite link:', error)
      addNotification('Failed to copy invite link')
    }
  }

  const isOwner = currentUser.uuid === lobby.createdBy
  const canStartGame = isOwner && lobby.canStart && !isStartingGame

  useEffect(() => {
    // Add event listeners
    addEventListener('lobby.player.joined', handleTransmitEvent)
    addEventListener('lobby.player.left', handleTransmitEvent)
    addEventListener('lobby.status.changed', handleTransmitEvent)

    return () => {
      // Cleanup event listeners
      removeEventListener('lobby.player.joined', handleTransmitEvent)
      removeEventListener('lobby.player.left', handleTransmitEvent)
      removeEventListener('lobby.status.changed', handleTransmitEvent)
    }
  }, [lobby.uuid])

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
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowInviteModal(true)}
            variant="outline"
            size="sm"
          >
            📤 Invite Friends
          </Button>
        </div>
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

      {/* Lobby Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lobby.name}</h1>
            {lobby.description && (
              <p className="text-gray-600 mt-1">{lobby.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                lobby.status === 'READY' ? 'bg-green-100 text-green-800' :
                lobby.status === 'FULL' ? 'bg-yellow-100 text-yellow-800' :
                lobby.status === 'WAITING' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {lobby.status}
              </span>
              <span className="text-sm text-gray-600">
                {lobby.currentPlayers}/{lobby.maxPlayers} players
              </span>
              {lobby.isPrivate && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  🔒 Private
                </span>
              )}
              {lobby.hasPassword && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                  🔑 Protected
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {canStartGame && (
              <Button
                onClick={handleStartGame}
                disabled={isStartingGame}
                className="bg-green-600 hover:bg-green-700"
              >
                {isStartingGame ? 'Starting...' : '🚀 Start Game'}
              </Button>
            )}
            
            <Button
              onClick={handleLeaveLobby}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              👋 Leave Lobby
            </Button>
          </div>
        </div>

        {/* Game Starting Overlay */}
        {isStartingGame && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
              <span className="text-green-800 font-medium">Game is starting...</span>
            </div>
          </div>
        )}
      </div>

      {/* Players List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Players</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lobby.players.map((player) => (
            <div
              key={player.uuid}
              className={`p-4 rounded-lg border ${
                player.uuid === currentUser.uuid
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {player.nickName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">{player.nickName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {player.uuid === lobby.createdBy && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          👑 Owner
                        </span>
                      )}
                      {player.uuid === currentUser.uuid && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          You
                        </span>
                      )}
                    </div>
                  </div>
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
            </span>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Friends</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share this link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/lobbies/join/${lobby.invitationCode || lobby.uuid}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <Button
                    onClick={copyInviteLink}
                    variant="outline"
                    size="sm"
                  >
                    {copiedInvite ? '✓' : '📋'}
                  </Button>
                </div>
                {copiedInvite && (
                  <p className="text-sm text-green-600 mt-1">Link copied!</p>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <p>Anyone with this link can join your lobby.</p>
                {lobby.hasPassword && (
                  <p className="mt-1 text-orange-600">
                    ⚠️ Players will need the lobby password to join.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                onClick={() => setShowInviteModal(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
