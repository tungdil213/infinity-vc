import React, { useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import { Toaster } from '@tyfo.dev/ui/primitives/sonner'
import { ToastHandler } from './toast_handler'
import { LobbyStatusSidebar } from './LobbyStatusSidebar'
import { AutoLeaveLobby } from './AutoLeaveLobby'
import { TransmitProvider } from '../contexts/TransmitContext'

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
  const currentLobby = props.currentLobby as {
    uuid: string
    name: string
    status: string
    currentPlayers: number
    maxPlayers: number
  } | null

  return (
    <TransmitProvider>
      {children}
      <FlashMessages />
      <ToastHandler />
      <LobbyStatusSidebar currentLobby={currentLobby} />
      <AutoLeaveLobby currentLobby={currentLobby} enabled={true} />
      <Toaster />
    </TransmitProvider>
  )
}
