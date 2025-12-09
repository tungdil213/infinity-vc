import React from 'react'
import { cn } from '../utils'

export interface ConnectionStatusIndicatorProps {
  isConnected: boolean
  labelConnected?: string
  labelDisconnected?: string
  className?: string
}

export function ConnectionStatusIndicator({
  isConnected,
  labelConnected = 'Connected',
  labelDisconnected = 'Disconnected',
  className,
}: ConnectionStatusIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span
        className={cn(
          'w-3 h-3 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-red-500'
        )}
      />
      <span className="text-gray-600">
        {isConnected ? labelConnected : labelDisconnected}
      </span>
    </div>
  )
}
