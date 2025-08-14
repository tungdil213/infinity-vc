import React from 'react'
import { Head, router } from '@inertiajs/react'
import GameLobby from '../components/GameLobby'

interface Player {
  uuid: string
  nickName: string
}

interface Lobby {
  uuid: string
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  players: Player[]
  availableActions: string[]
  createdAt: string
}

interface LobbyProps {
  lobby: Lobby
  user: {
    uuid: string
    nickName: string
  }
}

export default function Lobby({ lobby, user }: LobbyProps) {
  const handleLeaveLobby = () => {
    router.post(`/api/v1/lobbies/${lobby.uuid}/leave`)
  }

  const handleStartGame = () => {
    router.post(`/api/v1/lobbies/${lobby.uuid}/start`)
  }

  return (
    <>
      <Head title={`Lobby - ${lobby.name}`} />
      
      <div className="min-h-screen bg-gray-50">
        <GameLobby
          lobby={lobby}
          currentUser={user}
          onLeaveLobby={handleLeaveLobby}
          onStartGame={handleStartGame}
        />
      </div>
    </>
  )
}
