import React, { useState, useEffect } from 'react'
import { Head, router } from '@inertiajs/react'
import { LobbyList } from '../../../../packages/ui/src/components/lobby-list'
import { LobbyData } from '../../../../packages/ui/src/components/lobby-card'
import Layout from '../components/layout'
import { HeaderWrapper } from '../components/HeaderWrapper'
import { Footer } from '../../../../packages/ui/src/components/footer'
import { toast } from 'sonner'
import { useLobbyList } from '../hooks/use_lobby_list'
import { useLobbyContext } from '../contexts/LobbyContext'

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
  players: lobby.players.map((player) => ({
    ...player,
    isOnline: player.isOnline ?? true,
    isReady: player.isReady ?? false,
  })),
})

export default function Lobbies({ lobbies: initialLobbies, user, currentLobby }: LobbiesProps) {
  const [loading, setLoading] = useState(false)
  const lobbyContext = useLobbyContext()

  // Utiliser le nouveau hook useLobbyList avec les données Inertia initiales
  const {
    lobbies: realtimeLobbies,
    loading: realtimeLoading,
    error: realtimeError,
    total,
    createLobby,
    joinLobby: joinLobbyAction,
    leaveLobby: leaveLobbyAction,
    refresh,
  } = useLobbyList({}, initialLobbies)

  // Architecture hybride: Afficher toujours les données du hook (initialisées avec Inertia, mises à jour par Transmit)
  const lobbies = realtimeLobbies

  const handleCreateLobby = () => {
    router.get('/lobbies/create')
  }

  const handleJoinLobby = async (lobbyUuid: string) => {
    try {
      setLoading(true)
      router.post(
        `/lobbies/${lobbyUuid}/join`,
        {},
        {
          onSuccess: () => {
            toast.success('Vous avez rejoint le lobby avec succès!')
            router.visit(`/lobbies/${lobbyUuid}`)
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? (errors as any).error
                : 'Impossible de rejoindre le lobby'
            toast.error(errorMessage)
          },
        }
      )
    } catch (error) {
      toast.error('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveLobby = async (lobbyUuid: string) => {
    try {
      router.post(
        `/lobbies/${lobbyUuid}/leave`,
        {},
        {
          onSuccess: () => {
            toast.success('Vous avez quitté le lobby')
            router.reload()
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? (errors as any).error
                : 'Impossible de quitter le lobby'
            toast.error(errorMessage)
          },
        }
      )
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const handleViewLobby = (lobbyUuid: string) => {
    router.visit(`/lobbies/${lobbyUuid}`)
  }

  const handleShareLobby = (lobbyUuid: string) => {
    const url = `${window.location.origin}/lobbies/${lobbyUuid}`
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success('Lien du lobby copié!')
      })
      .catch(() => {
        toast.error('Impossible de copier le lien')
      })
  }

  const handleStartGame = async (lobbyUuid: string) => {
    try {
      router.post(
        `/lobbies/${lobbyUuid}/start`,
        {},
        {
          onSuccess: (page) => {
            toast.success('Partie démarrée!')
            // Le contrôleur redirige automatiquement vers /games/{gameUuid}
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? (errors as any).error
                : 'Impossible de démarrer la partie'
            toast.error(errorMessage)
          },
        }
      )
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const handleKickPlayer = async (lobbyUuid: string, playerUuid: string) => {
    try {
      router.post(
        `/lobbies/${lobbyUuid}/kick`,
        { playerUuid },
        {
          onSuccess: () => {
            toast.success('Joueur expulsé')
            router.reload()
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? (errors as any).error
                : "Impossible d'expulser le joueur"
            toast.error(errorMessage)
          },
        }
      )
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const handleRefresh = () => {
    refresh()
  }

  const headerUser = user.fullName
    ? {
        uuid: user.uuid,
        fullName: user.fullName,
        email: user.nickName,
      }
    : undefined

  const transformedLobbies = lobbies.map((lobby) => transformLobbyData(lobby as Lobby))

  return (
    <Layout>
      <Head title="Game Lobbies" />

      <div className="min-h-screen bg-gray-50">
        <HeaderWrapper user={headerUser} currentLobby={currentLobby} />

        <div className="container mx-auto px-4 py-8">
          <LobbyList
            lobbies={transformedLobbies}
            currentUser={user}
            loading={loading || realtimeLoading}
            total={total || lobbies.length}
            error={realtimeError || undefined}
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
