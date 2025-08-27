import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import LobbyList from '../components/LobbyList'
import Layout from '../components/layout'
import { HeaderWrapper } from '../components/HeaderWrapper'
import { Footer } from '../../../../packages/ui/src/components/footer'

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
    fullName?: string
  }
  currentLobby?: {
    uuid: string
    name: string
    status: string
    currentPlayers: number
    maxPlayers: number
  }
}

export default function Lobbies({ lobbies, user, currentLobby }: LobbiesProps) {
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateLobby = () => {
    setIsCreating(true)
    router.get('/lobbies/create')
  }

  const handleJoinLobby = (lobbyUuid: string) => {
    router.post(`/api/v1/lobbies/${lobbyUuid}/join`)
  }

  const headerUser = user.fullName ? {
    uuid: user.uuid,
    fullName: user.fullName,
    email: user.nickName // Utiliser nickName comme fallback pour email
  } : undefined

  return (
    <Layout>
      <Head title="Game Lobbies" />
      
      <div className="min-h-screen bg-gray-50">
        <HeaderWrapper user={headerUser} currentLobby={currentLobby} />
        
        <LobbyList
          initialLobbies={lobbies}
          currentUser={user}
          onCreateLobby={handleCreateLobby}
          onJoinLobby={handleJoinLobby}
        />
        
        <Footer />
      </div>
    </Layout>
  )
}
