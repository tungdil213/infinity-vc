import React from 'react'
import { cn } from '../utils'
import { Badge } from './primitives/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './primitives/tooltip'
import { 
  Clock, 
  CheckCircle, 
  Users, 
  Play, 
  Lock, 
  Globe, 
  AlertCircle,
  Pause,
  XCircle
} from 'lucide-react'

export type LobbyStatus = 'WAITING' | 'READY' | 'FULL' | 'IN_GAME' | 'PAUSED' | 'ENDED'

export interface LobbyStatusBadgeProps {
  status: LobbyStatus
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showIcon?: boolean
  showTooltip?: boolean
  className?: string
}

const statusConfig = {
  WAITING: {
    label: 'En attente',
    description: 'Le lobby attend des joueurs',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    outlineColor: 'border-yellow-500 text-yellow-700',
    secondaryColor: 'bg-yellow-50 text-yellow-600',
  },
  READY: {
    label: 'Prêt',
    description: 'Tous les joueurs sont prêts, la partie peut commencer',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    outlineColor: 'border-green-500 text-green-700',
    secondaryColor: 'bg-green-50 text-green-600',
  },
  FULL: {
    label: 'Complet',
    description: 'Le lobby est plein, aucune place disponible',
    icon: Users,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    outlineColor: 'border-orange-500 text-orange-700',
    secondaryColor: 'bg-orange-50 text-orange-600',
  },
  IN_GAME: {
    label: 'En jeu',
    description: 'La partie est en cours',
    icon: Play,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    outlineColor: 'border-blue-500 text-blue-700',
    secondaryColor: 'bg-blue-50 text-blue-600',
  },
  PAUSED: {
    label: 'En pause',
    description: 'La partie est temporairement suspendue',
    icon: Pause,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    outlineColor: 'border-gray-500 text-gray-700',
    secondaryColor: 'bg-gray-50 text-gray-600',
  },
  ENDED: {
    label: 'Terminé',
    description: 'La partie est terminée',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    outlineColor: 'border-red-500 text-red-700',
    secondaryColor: 'bg-red-50 text-red-600',
  },
}

const sizeConfig = {
  sm: { text: 'text-xs', padding: 'px-2 py-0.5', icon: 'h-3 w-3' },
  md: { text: 'text-sm', padding: 'px-2.5 py-1', icon: 'h-4 w-4' },
  lg: { text: 'text-base', padding: 'px-3 py-1.5', icon: 'h-5 w-5' },
}

export function LobbyStatusBadge({
  status,
  size = 'md',
  variant = 'default',
  showIcon = true,
  showTooltip = true,
  className,
}: LobbyStatusBadgeProps) {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  let colorClass = config.color
  if (variant === 'outline') {
    colorClass = `bg-transparent ${config.outlineColor}`
  } else if (variant === 'secondary') {
    colorClass = config.secondaryColor
  }

  const badgeContent = (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        sizeStyles.text,
        sizeStyles.padding,
        colorClass,
        className
      )}
    >
      {showIcon && <Icon className={sizeStyles.icon} />}
      {config.label}
    </Badge>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-medium">{config.label}</div>
            <div className="text-xs text-gray-500 mt-1">
              {config.description}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export interface LobbyPrivacyBadgeProps {
  isPrivate: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showIcon?: boolean
  showTooltip?: boolean
  className?: string
}

export function LobbyPrivacyBadge({
  isPrivate,
  size = 'md',
  variant = 'default',
  showIcon = true,
  showTooltip = true,
  className,
}: LobbyPrivacyBadgeProps) {
  const sizeStyles = sizeConfig[size]
  const Icon = isPrivate ? Lock : Globe

  const config = isPrivate
    ? {
        label: 'Privé',
        description: 'Lobby privé, invitation requise',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        outlineColor: 'border-purple-500 text-purple-700',
        secondaryColor: 'bg-purple-50 text-purple-600',
      }
    : {
        label: 'Public',
        description: 'Lobby public, ouvert à tous',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        outlineColor: 'border-blue-500 text-blue-700',
        secondaryColor: 'bg-blue-50 text-blue-600',
      }

  let colorClass = config.color
  if (variant === 'outline') {
    colorClass = `bg-transparent ${config.outlineColor}`
  } else if (variant === 'secondary') {
    colorClass = config.secondaryColor
  }

  const badgeContent = (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        sizeStyles.text,
        sizeStyles.padding,
        colorClass,
        className
      )}
    >
      {showIcon && <Icon className={sizeStyles.icon} />}
      {config.label}
    </Badge>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-medium">{config.label}</div>
            <div className="text-xs text-gray-500 mt-1">
              {config.description}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export interface LobbyCapacityBadgeProps {
  currentPlayers: number
  maxPlayers: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showIcon?: boolean
  showTooltip?: boolean
  className?: string
}

export function LobbyCapacityBadge({
  currentPlayers,
  maxPlayers,
  size = 'md',
  variant = 'default',
  showIcon = true,
  showTooltip = true,
  className,
}: LobbyCapacityBadgeProps) {
  const sizeStyles = sizeConfig[size]
  const isFull = currentPlayers >= maxPlayers
  const isNearFull = currentPlayers >= maxPlayers * 0.8

  const config = isFull
    ? {
        label: `${currentPlayers}/${maxPlayers}`,
        description: 'Lobby complet',
        color: 'bg-red-100 text-red-800 border-red-200',
        outlineColor: 'border-red-500 text-red-700',
        secondaryColor: 'bg-red-50 text-red-600',
      }
    : isNearFull
    ? {
        label: `${currentPlayers}/${maxPlayers}`,
        description: 'Presque complet',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        outlineColor: 'border-orange-500 text-orange-700',
        secondaryColor: 'bg-orange-50 text-orange-600',
      }
    : {
        label: `${currentPlayers}/${maxPlayers}`,
        description: 'Places disponibles',
        color: 'bg-green-100 text-green-800 border-green-200',
        outlineColor: 'border-green-500 text-green-700',
        secondaryColor: 'bg-green-50 text-green-600',
      }

  let colorClass = config.color
  if (variant === 'outline') {
    colorClass = `bg-transparent ${config.outlineColor}`
  } else if (variant === 'secondary') {
    colorClass = config.secondaryColor
  }

  const badgeContent = (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        sizeStyles.text,
        sizeStyles.padding,
        colorClass,
        className
      )}
    >
      {showIcon && <Users className={sizeStyles.icon} />}
      {config.label}
    </Badge>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-medium">{currentPlayers} sur {maxPlayers} joueurs</div>
            <div className="text-xs text-gray-500 mt-1">
              {config.description}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export interface LobbyBadgeGroupProps {
  status: LobbyStatus
  isPrivate?: boolean
  currentPlayers: number
  maxPlayers: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showIcons?: boolean
  showTooltips?: boolean
  className?: string
}

export function LobbyBadgeGroup({
  status,
  isPrivate,
  currentPlayers,
  maxPlayers,
  size = 'md',
  variant = 'default',
  showIcons = true,
  showTooltips = true,
  className,
}: LobbyBadgeGroupProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <LobbyStatusBadge
        status={status}
        size={size}
        variant={variant}
        showIcon={showIcons}
        showTooltip={showTooltips}
      />
      <LobbyCapacityBadge
        currentPlayers={currentPlayers}
        maxPlayers={maxPlayers}
        size={size}
        variant={variant}
        showIcon={showIcons}
        showTooltip={showTooltips}
      />
      {isPrivate !== undefined && (
        <LobbyPrivacyBadge
          isPrivate={isPrivate}
          size={size}
          variant={variant}
          showIcon={showIcons}
          showTooltip={showTooltips}
        />
      )}
    </div>
  )
}
