import React from 'react'
import { Card, CardHeader, CardTitle } from './primitives/card'
import { Button } from './primitives/button'
import { Badge } from './primitives/badge'
import { Users, Play, LogOut, UserPlus } from 'lucide-react'

export interface LobbyHeaderPanelProps {
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  isUserInLobby: boolean
  canJoinLobby: boolean
  canStartGame: boolean
  isJoiningLobby: boolean
  isStartingGame: boolean
  isLeavingLobby: boolean
  onJoinLobby: () => void
  onStartGame: () => void
  onLeaveLobby: () => void
}

export function LobbyHeaderPanel({
  name,
  status,
  currentPlayers,
  maxPlayers,
  isPrivate,
  isUserInLobby,
  canJoinLobby,
  canStartGame,
  isJoiningLobby,
  isStartingGame,
  isLeavingLobby,
  onJoinLobby,
  onStartGame,
  onLeaveLobby,
}: LobbyHeaderPanelProps) {
  const statusClass =
    status === 'READY'
      ? 'bg-green-100 text-green-800'
      : status === 'FULL'
        ? 'bg-yellow-100 text-yellow-800'
        : status === 'WAITING'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100 text-gray-800'

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{name}</CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge className={statusClass}>{status}</Badge>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Users className="w-4 h-4" />
                {currentPlayers}/{maxPlayers} players
              </span>
              {isPrivate && <Badge variant="secondary">Private</Badge>}
            </div>
          </div>

          <div className="flex gap-2">
            {canJoinLobby && (
              <Button
                onClick={onJoinLobby}
                disabled={isJoiningLobby}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isJoiningLobby ? 'Joining...' : 'Join Lobby'}
              </Button>
            )}

            {canStartGame && (
              <Button
                onClick={onStartGame}
                disabled={isStartingGame}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                {isStartingGame ? 'Starting...' : 'Start Game'}
              </Button>
            )}

            {isUserInLobby && (
              <Button
                onClick={onLeaveLobby}
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
      </CardHeader>
    </Card>
  )
}
