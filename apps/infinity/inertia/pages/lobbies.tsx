import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { LobbyList } from '../../../../packages/ui/src/components/lobby-list'
import { LobbyData } from '../../../../packages/ui/src/components/lobby-card'
import Layout from '../components/layout'
import { HeaderWrapper } from '../components/HeaderWrapper'
import { Footer } from '../../../../packages/ui/src/components/footer'
import { toast } from 'sonner'

interface Player {
  uuid: string
  nickName: string
  avatar?: string
  isReady?: boolean
  isOnline?: boolean
}

interface Lobby {
  uuid: string
  name: string
  description?: string
  status: 'WAITING' | 'READY' | 'FULL' | 'IN_GAME'
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  creatorUuid: string
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

// Fonction pour transformer les données du backend vers le format LobbyData
const transformLobbyData = (lobby: Lobby): LobbyData => ({
  uuid: lobby.uuid,
  name: lobby.name,
  description: lobby.description || `Lobby créé par ${lobby.createdBy}`,
  status: lobby.status,
  currentPlayers: lobby.currentPlayers,
  maxPlayers: lobby.maxPlayers,
  isPrivate: lobby.isPrivate,
  hasAvailableSlots: lobby.hasAvailableSlots,
  creatorUuid: lobby.creatorUuid || lobby.createdBy,
  createdAt: lobby.createdAt,
  players: lobby.players.map(player => ({
    ...player,
    isOnline: player.isOnline ?? true,
    isReady: player.isReady ?? false,
  })),
})

export default function Lobbies({ lobbies, user, currentLobby }: LobbiesProps) {
  const [loading, setLoading] = useState(false)

  const handleCreateLobby = () => {
    router.get('/lobbies/create')
  }

  const handleJoinLobby = async (lobbyUuid: string) => {
    try {
      setLoading(true)
      router.post(`/api/v1/lobbies/${lobbyUuid}/join`, {}, {
        onSuccess: () => {
          toast.success('Vous avez rejoint le lobby avec succès!')
          router.visit(`/lobbies/${lobbyUuid}`)
        },
        onError: (errors) => {
          toast.error('Impossible de rejoindre le lobby')
        }
      })
    } catch (error) {
      toast.error('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveLobby = async (lobbyUuid: string) => {
    try {
      router.post(`/api/v1/lobbies/${lobbyUuid}/leave`, {}, {
        onSuccess: () => {
          toast.success('Vous avez quitté le lobby')
        },
        onError: () => {
          toast.error('Impossible de quitter le lobby')
        }
      })
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const handleViewLobby = (lobbyUuid: string) => {
    router.visit(`/lobbies/${lobbyUuid}`)
  }

  const handleShareLobby = (lobbyUuid: string) => {
    const url = `${window.location.origin}/lobbies/${lobbyUuid}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Lien du lobby copié!')
    }).catch(() => {
      toast.error('Impossible de copier le lien')
    })
  }

  const handleStartGame = async (lobbyUuid: string) => {
    try {
      router.post(`/api/v1/lobbies/${lobbyUuid}/start`, {}, {
        onSuccess: () => {
          toast.success('Partie démarrée!')
          router.visit(`/lobbies/${lobbyUuid}`)
        },
        onError: () => {
          toast.error('Impossible de démarrer la partie')
        }
      })
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const handleKickPlayer = async (lobbyUuid: string, playerUuid: string) => {
    try {
      router.post(`/api/v1/lobbies/${lobbyUuid}/kick`, { playerUuid }, {
        onSuccess: () => {
          toast.success('Joueur expulsé')
        },
        onError: () => {
          toast.error('Impossible d\'expulser le joueur')
        }
      })
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const handleRefresh = () => {
    router.reload()
  }

  const headerUser = user.fullName ? {
    uuid: user.uuid,
    fullName: user.fullName,
    email: user.nickName
  } : undefined

  const transformedLobbies = lobbies.map(transformLobbyData)

  return (
    <Layout>
      <Head title="Game Lobbies" />
      
      <div className="min-h-screen bg-gray-50">
        <HeaderWrapper user={headerUser} currentLobby={currentLobby} />
        
        <div className="container mx-auto px-4 py-8">
          <LobbyList
            lobbies={transformedLobbies}
            currentUser={user}
            loading={loading}
            total={lobbies.length}
            onJoin={handleJoinLobby}
            onLeave={handleLeaveLobby}
            onView={handleViewLobby}
            onShare={handleShareLobby}
            onStart={handleStartGame}
            onKick={handleKickPlayer}
            onCreateLobby={handleCreateLobby}
            onRefresh={handleRefresh}
          />
        </div>
        
        <Footer />
      </div>
    </Layout>
  )
}
