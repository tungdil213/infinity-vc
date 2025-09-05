import React from 'react'
import { cn } from '../utils'
import { Avatar, AvatarFallback, AvatarImage } from './primitives/avatar'
import { Badge } from './primitives/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './primitives/tooltip'
import { Crown, Check, Circle, Minus } from 'lucide-react'

export interface PlayerAvatarProps {
  player: {
    uuid: string
    nickName: string
    avatar?: string
    isReady?: boolean
    isOnline?: boolean
  }
  currentUser?: {
    uuid: string
    nickName: string
  }
  creatorUuid?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
  showReadyBadge?: boolean
  showCreatorBadge?: boolean
  showYouBadge?: boolean
  showTooltip?: boolean
  onKick?: (playerUuid: string) => void
  className?: string
}

const sizeConfig = {
  xs: { avatar: 'h-4 w-4', badge: 'h-2 w-2', text: 'text-xs' },
  sm: { avatar: 'h-6 w-6', badge: 'h-3 w-3', text: 'text-xs' },
  md: { avatar: 'h-8 w-8', badge: 'h-4 w-4', text: 'text-sm' },
  lg: { avatar: 'h-10 w-10', badge: 'h-5 w-5', text: 'text-base' },
  xl: { avatar: 'h-12 w-12', badge: 'h-6 w-6', text: 'text-lg' },
}

export function PlayerAvatar({
  player,
  currentUser,
  creatorUuid,
  size = 'md',
  showStatus = true,
  showReadyBadge = false,
  showCreatorBadge = true,
  showYouBadge = true,
  showTooltip = true,
  onKick,
  className,
}: PlayerAvatarProps) {
  const isCreator = creatorUuid === player.uuid
  const isCurrentUser = currentUser?.uuid === player.uuid
  const config = sizeConfig[size]

  const avatarContent = (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={config.avatar}>
        <AvatarImage src={player.avatar} alt={player.nickName} />
        <AvatarFallback className={config.text}>
          {player.nickName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Online/Offline Status */}
      {showStatus && (
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white',
          config.badge,
          player.isOnline ? 'bg-green-500' : 'bg-gray-400'
        )} />
      )}

      {/* Ready Badge */}
      {showReadyBadge && player.isReady && (
        <div className={cn(
          'absolute -top-1 -right-1 bg-green-500 text-white rounded-full flex items-center justify-center',
          config.badge
        )}>
          <Check className="h-2 w-2" />
        </div>
      )}
    </div>
  )

  const badges = (
    <div className="flex items-center gap-1 mt-1">
      {showCreatorBadge && isCreator && (
        <Badge variant="outline" className="text-xs px-1 py-0">
          <Crown className="h-2 w-2 mr-1 text-yellow-500" />
          Créateur
        </Badge>
      )}
      {showYouBadge && isCurrentUser && (
        <Badge className="text-xs px-1 py-0 bg-blue-100 text-blue-800">
          Vous
        </Badge>
      )}
      {showReadyBadge && player.isReady && (
        <Badge className="text-xs px-1 py-0 bg-green-100 text-green-800">
          <Check className="h-2 w-2 mr-1" />
          Prêt
        </Badge>
      )}
    </div>
  )

  const tooltipContent = showTooltip ? (
    <div className="text-center">
      <div className="font-medium">{player.nickName}</div>
      <div className="text-xs text-gray-500 mt-1">
        {player.isOnline ? 'En ligne' : 'Hors ligne'}
        {player.isReady && ' • Prêt'}
        {isCreator && ' • Créateur'}
        {isCurrentUser && ' • Vous'}
      </div>
    </div>
  ) : null

  if (!showTooltip) {
    return (
      <div className="flex flex-col items-center">
        {avatarContent}
        {size !== 'xs' && size !== 'sm' && badges}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center cursor-pointer">
            {avatarContent}
            {size !== 'xs' && size !== 'sm' && badges}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export interface PlayerAvatarGroupProps {
  players: Array<{
    uuid: string
    nickName: string
    avatar?: string
    isReady?: boolean
    isOnline?: boolean
  }>
  currentUser?: {
    uuid: string
    nickName: string
  }
  creatorUuid?: string
  maxVisible?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
  showReadyBadge?: boolean
  showCreatorBadge?: boolean
  showYouBadge?: boolean
  showTooltip?: boolean
  className?: string
}

export function PlayerAvatarGroup({
  players,
  currentUser,
  creatorUuid,
  maxVisible = 4,
  size = 'sm',
  showStatus = true,
  showReadyBadge = false,
  showCreatorBadge = false,
  showYouBadge = false,
  showTooltip = true,
  className,
}: PlayerAvatarGroupProps) {
  const visiblePlayers = players.slice(0, maxVisible)
  const remainingCount = players.length - maxVisible
  const config = sizeConfig[size]

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visiblePlayers.map((player) => (
        <div key={player.uuid} className="relative">
          <PlayerAvatar
            player={player}
            currentUser={currentUser}
            creatorUuid={creatorUuid}
            size={size}
            showStatus={showStatus}
            showReadyBadge={showReadyBadge}
            showCreatorBadge={showCreatorBadge}
            showYouBadge={showYouBadge}
            showTooltip={showTooltip}
            className="border-2 border-white"
          />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'rounded-full bg-gray-200 border-2 border-white flex items-center justify-center cursor-pointer',
                config.avatar
              )}>
                <span className={cn('text-gray-600 font-medium', config.text)}>
                  +{remainingCount}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <div className="font-medium">Autres joueurs ({remainingCount})</div>
                <div className="text-xs text-gray-500 mt-1">
                  {players.slice(maxVisible).map(p => p.nickName).join(', ')}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

export interface PlayerListProps {
  players: Array<{
    uuid: string
    nickName: string
    avatar?: string
    isReady?: boolean
    isOnline?: boolean
  }>
  currentUser?: {
    uuid: string
    nickName: string
  }
  creatorUuid?: string
  showActions?: boolean
  onKick?: (playerUuid: string) => void
  onPromote?: (playerUuid: string) => void
  className?: string
}

export function PlayerList({
  players,
  currentUser,
  creatorUuid,
  showActions = false,
  onKick,
  onPromote,
  className,
}: PlayerListProps) {
  const isCurrentUserCreator = currentUser?.uuid === creatorUuid

  return (
    <div className={cn('space-y-2', className)}>
      {players.map((player) => {
        const isCreator = creatorUuid === player.uuid
        const isCurrentUser = currentUser?.uuid === player.uuid
        const canKick = isCurrentUserCreator && !isCreator && !isCurrentUser

        return (
          <div
            key={player.uuid}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border',
              isCurrentUser ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
            )}
          >
            <div className="flex items-center gap-3">
              <PlayerAvatar
                player={player}
                currentUser={currentUser}
                creatorUuid={creatorUuid}
                size="md"
                showStatus={true}
                showReadyBadge={true}
                showCreatorBadge={true}
                showYouBadge={true}
                showTooltip={false}
              />
              <div>
                <div className="font-medium text-gray-900">{player.nickName}</div>
                <div className="text-sm text-gray-500">
                  {player.isOnline ? 'En ligne' : 'Hors ligne'}
                  {player.isReady && ' • Prêt à jouer'}
                </div>
              </div>
            </div>

            {showActions && canKick && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onKick?.(player.uuid)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Expulser {player.nickName}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
