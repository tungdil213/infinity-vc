import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import LobbyList from '../components/LobbyList'
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
  players: Player[]
  availableActions: string[]
  createdAt: string
}

interface LobbiesProps {
  lobbies: Lobby[]
  user: {
    uuid: string
    nickName: string
  }
}

export default function Lobbies({ lobbies, user }: LobbiesProps) {
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateLobby = () => {
    setIsCreating(true)
    router.get('/lobbies/create')
  }

  const handleJoinLobby = (lobbyUuid: string) => {
    router.post(`/api/v1/lobbies/${lobbyUuid}/join`)
  }

  return (
    <Layout>
      <Head title="Game Lobbies" />
      
      <div className="min-h-screen bg-gray-50">
        <LobbyList
          initialLobbies={lobbies}
          currentUser={user}
          onCreateLobby={handleCreateLobby}
          onJoinLobby={handleJoinLobby}
        />
      </div>
    </Layout>
  )
}
