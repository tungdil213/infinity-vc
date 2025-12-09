import React, { useState, useEffect } from 'react'
import { Head, router } from '@inertiajs/react'
import { LobbyList } from '@tyfo.dev/ui/components/lobby-list'
import { LobbyData } from '@tyfo.dev/ui/components/lobby-card'
import { HeaderWrapper } from '../layouts/HeaderWrapper'
import { Footer } from '@tyfo.dev/ui/components/footer'
import { toast } from 'sonner'
import { useLobbyService } from '../hooks/use_lobby_service'
import { LobbyListState } from '../services/lobby_service'

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

function LobbiesPage({ lobbies: initialLobbies, user, currentLobby }: LobbiesProps) {
  const [loading, setLoading] = useState(false)
  const { service: lobbyService, isConnected } = useLobbyService()
  const [lobbyListState, setLobbyListState] = useState<LobbyListState>({
    lobbies: initialLobbies,
    loading: false,
    error: null,
    total: initialLobbies.length,
  })

  // S'abonner aux mises à jour temps réel
  useEffect(() => {
    if (!lobbyService) return

    const unsubscribe = lobbyService.subscribeLobbyList((state) => {
      setLobbyListState(state)
    })

    // Initialiser avec les données du serveur
    lobbyService.fetchLobbies()

    return () => {
      unsubscribe()
    }
  }, [lobbyService])

  // Utiliser toujours l'état géré par le LobbyService (initialisé avec les données serveur)
  const lobbies = lobbyListState.lobbies

  const handleCreateLobby = () => {
    router.get('/lobbies/create')
  }

  const handleJoinLobby = async (lobbyUuid: string) => {
    try {
      setLoading(true)
      router.post(`/lobbies/${lobbyUuid}/join`, {}, {
        onSuccess: () => {
          toast.success('Vous avez rejoint le lobby avec succès!')
          router.visit(`/lobbies/${lobbyUuid}`)
        },
        onError: (errors) => {
          const errorMessage = typeof errors === 'object' && errors !== null && 'error' in errors 
            ? (errors as any).error 
            : 'Impossible de rejoindre le lobby'
          toast.error(errorMessage)
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
      router.post(`/lobbies/${lobbyUuid}/leave`, {}, {
        onSuccess: () => {
          toast.success('Vous avez quitté le lobby')
          router.reload()
        },
        onError: (errors) => {
          const errorMessage = typeof errors === 'object' && errors !== null && 'error' in errors 
            ? (errors as any).error 
            : 'Impossible de quitter le lobby'
          toast.error(errorMessage)
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
      router.post(`/lobbies/${lobbyUuid}/start`, {}, {
        onSuccess: (page) => {
          toast.success('Partie démarrée!')
          // Le contrôleur redirige automatiquement vers /games/{gameUuid}
        },
        onError: (errors) => {
          const errorMessage = typeof errors === 'object' && errors !== null && 'error' in errors 
            ? (errors as any).error 
            : 'Impossible de démarrer la partie'
          toast.error(errorMessage)
        }
      })
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const handleKickPlayer = async (lobbyUuid: string, playerUuid: string) => {
    try {
      router.post(`/lobbies/${lobbyUuid}/kick`, { playerUuid }, {
        onSuccess: () => {
          toast.success('Joueur expulsé')
          router.reload()
        },
        onError: (errors) => {
          const errorMessage = typeof errors === 'object' && errors !== null && 'error' in errors 
            ? (errors as any).error 
            : 'Impossible d\'expulser le joueur'
          toast.error(errorMessage)
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

  const transformedLobbies = lobbies.map((lobby) => transformLobbyData(lobby as Lobby))
  const isRealTimeLoading = lobbyListState.loading

  return (
    <>
      <Head title="Game Lobbies" />

      <div className="min-h-screen bg-gray-50">
        <HeaderWrapper user={headerUser} currentLobby={currentLobby} />

        <div className="container mx-auto px-4 py-8">
          <LobbyList
            lobbies={transformedLobbies}
            currentUser={user}
            loading={loading || isRealTimeLoading}
            total={lobbyListState.total}
            error={lobbyListState.error || undefined}
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
    </>
  )
}

// Appliquer le layout global (avec TransmitProvider) autour de la page
import Layout from '../layouts/layout'
;(LobbiesPage as any).layout = (page: React.ReactNode) => <Layout>{page}</Layout>

export default LobbiesPage
