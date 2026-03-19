import React from 'react'
import { Head, router } from '@inertiajs/react'
import GameLobby from '../features/GameLobby'
import Layout from '../layouts/layout'

interface Player {
  uuid: string
  nickName: string
}

interface Lobby {
  uuid: string
  name: string
  description?: string
  status: string
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  creator: {
    uuid: string
    nickName: string
  }
  players: Player[]
  availableActions: string[]
  createdAt: string
  invitationCode: string
  hasPassword: boolean
}

interface LobbyProps {
  lobby: Lobby
  user: {
    uuid: string
    nickName: string
  }
}

export default function Lobby({ lobby, user }: LobbyProps) {
  return (
    <Layout>
      <Head title={`Lobby - ${lobby.name}`} />

      <div className="min-h-screen bg-secondary-background">
        <GameLobby
          lobbyUuid={lobby.uuid}
          lobbyName={lobby.name}
          lobbyDescription={lobby.description}
          hasPassword={lobby.hasPassword}
          currentUser={user}
        />
      </div>
    </Layout>
  )
}
