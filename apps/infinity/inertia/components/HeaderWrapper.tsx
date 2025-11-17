import React from 'react'
import { router } from '@inertiajs/react'
import { Header } from '../../../../packages/ui/src/components/header'
import { useTransmit } from '../contexts/TransmitContext'
import { getLobbyService } from '../services/lobby_service_singleton'

interface User {
  uuid: string
  fullName: string
  email: string
}

interface CurrentLobby {
  uuid: string
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
}

interface HeaderWrapperProps {
  user?: User
  currentLobby?: CurrentLobby
  className?: string
}

export function HeaderWrapper({ user, currentLobby, className }: HeaderWrapperProps) {
  const { isConnected, unsubscribeAll } = useTransmit()
  const lobbyService = getLobbyService()

  const handleCreateLobby = () => {
    router.visit('/lobbies/create')
  }

  const handleJoinByCode = async (code: string) => {
    if (!user || !lobbyService) throw new Error('User or lobby service not available')

    await lobbyService.joinLobby(code, user.uuid)
    router.visit(`/lobbies/${code}`)
  }

  const handleGoToCurrentLobby = () => {
    if (currentLobby) {
      router.visit(`/lobbies/${currentLobby.uuid}`)
    }
  }

  const handleGoToLobbies = () => {
    router.visit('/lobbies')
  }

  const handleLogin = () => {
    router.visit('/auth/login')
  }

  const handleRegister = () => {
    router.visit('/auth/register')
  }

  const handleLogout = async () => {
    await unsubscribeAll()
    router.post('/auth/logout')
  }

  const handleProfile = () => {
    // TODO: Implement profile page
    console.log('Profile clicked')
  }

  const handleSettings = () => {
    // TODO: Implement settings page
    console.log('Settings clicked')
  }

  return (
    <Header
      user={user}
      currentLobby={currentLobby}
      isConnected={isConnected}
      className={className}
      onCreateLobby={handleCreateLobby}
      onJoinByCode={handleJoinByCode}
      onGoToCurrentLobby={handleGoToCurrentLobby}
      onGoToLobbies={handleGoToLobbies}
      onLogin={handleLogin}
      onRegister={handleRegister}
      onLogout={handleLogout}
      onProfile={handleProfile}
      onSettings={handleSettings}
    />
  )
}
