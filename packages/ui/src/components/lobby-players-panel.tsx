import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card'
import { Badge } from './primitives/badge'
import { Users } from 'lucide-react'

export interface LobbyPlayer {
  uuid: string
  nickName: string
}

export interface LobbyPlayersPanelProps {
  players: LobbyPlayer[]
  currentUserUuid?: string
  creatorUuid?: string
  maxPlayers: number
  currentPlayers: number
  hasAvailableSlots: boolean
  createdAt: string | Date
}

export function LobbyPlayersPanel({
  players,
  currentUserUuid,
  creatorUuid,
  maxPlayers,
  currentPlayers,
  hasAvailableSlots,
  createdAt,
}: LobbyPlayersPanelProps) {
  const safePlayers = players || []
  const createdAtDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Players
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {safePlayers.map((player) => (
            <div
              key={player.uuid}
              className={`p-4 rounded-lg border ${
                player.uuid === currentUserUuid ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{player.nickName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {player.uuid === creatorUuid && (
                      <Badge variant="outline" className="text-xs">
                        Creator
                      </Badge>
                    )}
                    {player.uuid === currentUserUuid && (
                      <Badge className="text-xs bg-blue-100 text-blue-800">
                        You
                      </Badge>
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

          {Array.from({ length: Math.max(0, maxPlayers - currentPlayers) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
            >
              <span className="text-gray-500 text-sm">Waiting for player...</span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Created: {createdAtDate.toLocaleString()}</span>
            <span>
              {hasAvailableSlots ? 'Open for new players' : 'Lobby is full'}
              {/* Debug info - remove in production */}
              <span className="text-xs text-gray-400 ml-2">
                (Debug: {currentPlayers}/{maxPlayers}, hasSlots: {hasAvailableSlots ? 'true' : 'false'})
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
