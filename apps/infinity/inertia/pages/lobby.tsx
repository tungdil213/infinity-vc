import React from 'react'
import { Head, router } from '@inertiajs/react'
import GameLobby from '../components/GameLobby'
import Layout from '../components/layout'

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
      
      <div className="min-h-screen bg-gray-50">
        <GameLobby
          lobbyUuid={lobby.uuid}
          currentUser={user}
        />
      </div>
    </Layout>
  )
}
