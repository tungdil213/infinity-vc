import React from 'react'
import { cn } from '../utils'
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card'
import { Badge } from './primitives/badge'
import { Button } from './primitives/button'
import { Avatar, AvatarFallback, AvatarImage } from './primitives/avatar'
import { Users, Crown, Lock, Play, Eye, Share2, Settings, UserMinus } from 'lucide-react'

export interface Player {
  uuid: string
  nickName: string
  avatar?: string
  isReady?: boolean
}

export interface LobbyData {
  uuid: string
  name: string
  description?: string
  status: 'WAITING' | 'READY' | 'FULL' | 'IN_GAME' | 'PRIVATE'
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasAvailableSlots: boolean
  creatorUuid: string
  players?: Array<{
    uuid: string
    nickName: string
    avatar?: string
    isReady?: boolean
    isOnline?: boolean
  }>
  createdAt: string
}

export interface LobbyCardProps {
  lobby: LobbyData
  currentUser?: {
    uuid: string
    nickName: string
  }
  variant?: 'compact' | 'detailed' | 'featured'
  onJoin?: (lobbyUuid: string) => void
  onLeave?: (lobbyUuid: string) => void
  onView?: (lobbyUuid: string) => void
  onShare?: (lobbyUuid: string) => void
  onStart?: (lobbyUuid: string) => void
  onKick?: (lobbyUuid: string, playerUuid: string) => void
  onSettings?: (lobbyUuid: string) => void
  className?: string
}

const statusConfig = {
  WAITING: { color: 'bg-blue-100 text-blue-800', label: 'En attente' },
  READY: { color: 'bg-green-100 text-green-800', label: 'Prêt' },
  FULL: { color: 'bg-yellow-100 text-yellow-800', label: 'Complet' },
  IN_GAME: { color: 'bg-purple-100 text-purple-800', label: 'En jeu' },
  PRIVATE: { color: 'bg-gray-100 text-gray-800', label: 'Privé' },
}

export function LobbyCard({
  lobby,
  currentUser,
  variant = 'detailed',
  onJoin,
  onLeave,
  onView,
  onShare,
  onStart,
  onKick,
  onSettings,
  className,
}: LobbyCardProps) {
  const isCreator = currentUser?.uuid === lobby.creatorUuid
  const userInLobby = lobby.players?.some(p => p.uuid === currentUser?.uuid)
  const canJoin = !userInLobby && lobby.hasAvailableSlots && lobby.status !== 'IN_GAME'
  const canStart = lobby.status === 'READY' && isCreator

  if (variant === 'compact') {
    return (
      <Card className={cn('hover:shadow-md transition-shadow', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{lobby.name}</h3>
                  {lobby.isPrivate && <Lock className="h-3 w-3 text-gray-500" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn('text-xs', statusConfig[lobby.status].color)}>
                    {statusConfig[lobby.status].label}
                  </Badge>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {lobby.currentPlayers}/{lobby.maxPlayers}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {canJoin && (
                <Button size="sm" onClick={() => onJoin?.(lobby.uuid)}>
                  Rejoindre
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView?.(lobby.uuid)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'featured') {
    return (
      <Card className={cn('border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50', className)}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                {lobby.name}
                {lobby.isPrivate && <Lock className="h-4 w-4 text-gray-500" />}
              </CardTitle>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={cn('text-sm', statusConfig[lobby.status].color)}>
                  {statusConfig[lobby.status].label}
                </Badge>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {lobby.currentPlayers}/{lobby.maxPlayers} joueurs
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {canStart && (
                <Button onClick={() => onStart?.(lobby.uuid)} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Démarrer
                </Button>
              )}
              {canJoin && (
                <Button onClick={() => onJoin?.(lobby.uuid)}>
                  Rejoindre
                </Button>
              )}
              {userInLobby && !isCreator && (
                <Button variant="outline" onClick={() => onLeave?.(lobby.uuid)}>
                  Quitter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Créateur</h4>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={lobby.players?.find(p => p.uuid === lobby.creatorUuid)?.avatar} />
                  <AvatarFallback className="text-xs">
                    {lobby.players?.find(p => p.uuid === lobby.creatorUuid)?.nickName?.charAt(0).toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{lobby.players?.find(p => p.uuid === lobby.creatorUuid)?.nickName || 'Créateur'}</span>
                <Crown className="h-3 w-3 text-yellow-500" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Créé le</h4>
              <span className="text-sm text-gray-600">
                {new Date(lobby.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default detailed variant
  return (
    <Card className={cn('hover:shadow-lg transition-shadow', className)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {lobby.name}
              {lobby.isPrivate && <Lock className="h-4 w-4 text-gray-500" />}
            </CardTitle>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={cn(statusConfig[lobby.status].color)}>
                {statusConfig[lobby.status].label}
              </Badge>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Users className="h-4 w-4" />
                {lobby.currentPlayers}/{lobby.maxPlayers} joueurs
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            {onShare && (
              <Button variant="ghost" size="sm" onClick={() => onShare(lobby.uuid)}>
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            {isCreator && onSettings && (
              <Button variant="ghost" size="sm" onClick={() => onSettings(lobby.uuid)}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Creator */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={lobby.players?.find(p => p.uuid === lobby.creatorUuid)?.avatar} />
              <AvatarFallback>
                {lobby.players?.find(p => p.uuid === lobby.creatorUuid)?.nickName?.charAt(0).toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{lobby.players?.find(p => p.uuid === lobby.creatorUuid)?.nickName || 'Créateur'}</span>
                <Crown className="h-3 w-3 text-yellow-500" />
              </div>
              <span className="text-xs text-gray-500">Créateur</span>
            </div>
          </div>

          {/* Players Preview */}
          {lobby.players && lobby.players.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Joueurs</span>
                <Badge variant="outline" className="text-xs">
                  {lobby.players.length}
                </Badge>
              </div>
              <div className="flex -space-x-2">
                {lobby.players.slice(0, 4).map((player) => (
                  <Avatar key={player.uuid} className="h-6 w-6 border-2 border-white">
                    <AvatarImage src={player.avatar} />
                    <AvatarFallback className="text-xs">
                      {player.nickName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {lobby.players.length > 4 && (
                  <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-gray-600">+{lobby.players.length - 4}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {canStart && (
              <Button onClick={() => onStart?.(lobby.uuid)} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Démarrer
              </Button>
            )}
            {canJoin && (
              <Button onClick={() => onJoin?.(lobby.uuid)}>
                Rejoindre
              </Button>
            )}
            {userInLobby && !isCreator && (
              <Button variant="outline" onClick={() => onLeave?.(lobby.uuid)}>
                Quitter
              </Button>
            )}
            <Button variant="outline" onClick={() => onView?.(lobby.uuid)}>
              <Eye className="h-4 w-4 mr-2" />
              Voir détails
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
