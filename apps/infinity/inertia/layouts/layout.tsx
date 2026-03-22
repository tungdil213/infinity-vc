import React, { useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import { Toaster } from '@infinity.dev/ui/primitives/sonner'
import { ToastHandler } from './toast_handler'
import { LobbyStatusSidebar } from './LobbyStatusSidebar'
import { AutoLeaveLobby } from './AutoLeaveLobby'
import { LobbyOwnerNotifications } from './LobbyOwnerNotifications'
import { TransmitProvider } from '../contexts/TransmitContext'
import { disposeLobbyService } from '../hooks/use_lobby_service'

// Flash messages component using Sonner
function FlashMessages() {
  const { props } = usePage()
  const flash = props.flash as { success?: string; error?: string } | undefined

  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success)
    }

    if (flash?.error) {
      toast.error(flash.error)
    }
  }, [flash])

  return null
}

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { props } = usePage()
  const user = props.user as { uuid?: string; fullName?: string } | null | undefined
  const isRealtimeEnabled = Boolean(user?.uuid)
  const currentLobby = props.currentLobby as {
    uuid: string
    name: string
    status: string
    currentPlayers: number
    maxPlayers: number
    canStart?: boolean
    isOwner?: boolean
    createdBy?: string
    isPrivate?: boolean
    hasPassword?: boolean
  } | null

  useEffect(() => {
    return () => {
      disposeLobbyService()
    }
  }, [])

  return (
    <TransmitProvider enabled={isRealtimeEnabled}>
      {children}
      <FlashMessages />
      <ToastHandler />
      <LobbyStatusSidebar
        currentLobby={currentLobby}
        currentUser={
          user?.uuid
            ? {
                uuid: user.uuid,
                fullName: user.fullName ?? '',
              }
            : undefined
        }
      />
      <LobbyOwnerNotifications userUuid={user?.uuid} />
      <AutoLeaveLobby currentLobby={currentLobby} enabled={true} />
      <Toaster />
    </TransmitProvider>
  )
}
