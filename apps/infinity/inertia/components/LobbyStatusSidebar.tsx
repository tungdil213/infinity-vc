import React, { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@tyfo.dev/ui/primitives/card'
import { Badge } from '@tyfo.dev/ui/primitives/badge'
import { Users, LogOut, Play, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { useLobbyDetails } from '../hooks/use_lobby_details'
import { useLobbyContext } from '../contexts/LobbyContext'
import { Lobby, getLobbyPermissions, LOBBY_STATUS } from '../types/lobby'

interface LobbyStatusSidebarProps {
  // Utilise les données Inertia comme source initiale
  initialLobby: Lobby | null
  currentUser?: {
    uuid: string
    fullName: string
  }
}

export function LobbyStatusSidebar({ initialLobby, currentUser }: LobbyStatusSidebarProps) {
  console.log('🔧 LobbyStatusSidebar: Initializing component', { 
    hasInitialLobby: !!initialLobby,
    initialLobbyUuid: initialLobby?.uuid,
    initialLobbyPlayers: initialLobby?.players?.length,
    hasCurrentUser: !!currentUser,
    currentUserUuid: currentUser?.uuid
  })

  const { lobbyService } = useLobbyContext()
  
  // ✅ Ne charger que si on a un lobby
  const { lobby: realtimeLobby, loading, error } = useLobbyDetails(
    initialLobby?.uuid || null  // null au lieu de '' pour éviter chargement inutile
  )
  const [isLeavingLobby, setIsLeavingLobby] = useState(false)
  const [timeoutReached, setTimeoutReached] = useState(false)
  
  // Garder la dernière version valide du lobby pour éviter les disparitions pendant les updates
  const [lastValidLobby, setLastValidLobby] = useState<Lobby | null>(initialLobby)
  
  console.log('🔧 LobbyStatusSidebar: State debug', {
    hasRealtimeLobby: !!realtimeLobby,
    realtimeLobbyPlayers: realtimeLobby?.players?.length,
    hasLastValidLobby: !!lastValidLobby,
    lastValidLobbyPlayers: lastValidLobby?.players?.length,
    loading,
    hasError: !!error
  })
  
  useEffect(() => {
    console.log('🔧 LobbyStatusSidebar: Updating lastValidLobby', {
      hasRealtimeLobby: !!realtimeLobby,
      hasInitialLobby: !!initialLobby
    })
    
    if (realtimeLobby) {
      console.log('🔧 LobbyStatusSidebar: Setting lastValidLobby from realtimeLobby', {
        players: realtimeLobby.players?.length
      })
      setLastValidLobby(realtimeLobby as Lobby)
    } else if (initialLobby) {
      console.log('🔧 LobbyStatusSidebar: Setting lastValidLobby from initialLobby', {
        players: initialLobby.players?.length
      })
      setLastValidLobby(initialLobby)
    }
  }, [realtimeLobby, initialLobby])

  // Utilise les données temps réel si disponibles, sinon la dernière version valide
  const effectiveLobby = realtimeLobby || lastValidLobby
  
  console.log('🔧 LobbyStatusSidebar: Effective lobby', {
    hasEffectiveLobby: !!effectiveLobby,
    effectiveLobbyUuid: effectiveLobby?.uuid,
    effectiveLobbyPlayers: effectiveLobby?.players?.length,
    source: realtimeLobby ? 'realtime' : lastValidLobby ? 'cache' : 'none'
  })

  // Timeout protection - Seulement si on a un lobby à charger
  useEffect(() => {
    // ✅ Ne démarrer le timeout QUE si on a vraiment un lobby à charger
    if (loading && !timeoutReached && initialLobby?.uuid) {
      console.log('🔧 LobbyStatusSidebar: Starting timeout protection (30s)', {
        lobbyUuid: initialLobby.uuid
      })
      const timeout = setTimeout(() => {
        console.warn('🔧 LobbyStatusSidebar: ❌ Timeout reached après 30s', {
          loading,
          hasRealtimeLobby: !!realtimeLobby,
          hasLastValidLobby: !!lastValidLobby
        })
        setTimeoutReached(true)
        toast.error('Connection timeout - using cached data')
      }, 30000)  // 30 secondes

      return () => {
        console.log('🔧 LobbyStatusSidebar: Clearing timeout protection')
        clearTimeout(timeout)
      }
    }
  }, [loading, timeoutReached, initialLobby?.uuid, realtimeLobby, lastValidLobby])

  // Ne pas afficher le sidebar si:
  // 1. Pas de lobby ET pas en chargement (vraiment rien à afficher)
  // 2. OU pas d'UUID (pas sur une page lobby)
  if (!effectiveLobby && !loading) {
    console.log('🔧 LobbyStatusSidebar: ❌ No lobby to display', {
      checkedRealtime: !!realtimeLobby,
      checkedCache: !!lastValidLobby,
      checkedInitial: !!initialLobby,
      loading
    })
    return null
  }
  
  // Si en chargement et pas de lobby, ne rien afficher (attendre les données)
  if (!effectiveLobby && loading) {
    console.log('🔧 LobbyStatusSidebar: ⏳ Loading lobby data...')
    return null
  }
  
  // À ce stade, effectiveLobby existe forcément (sinon on serait retourné avant)
  if (!effectiveLobby) {
    console.error('🔧 LobbyStatusSidebar: ❌ Impossible state - no lobby but not loading')
    return null
  }
  
  console.log('🔧 LobbyStatusSidebar: ✅ Rendering with lobby', {
    uuid: effectiveLobby.uuid,
    playersCount: effectiveLobby.players?.length,
    players: effectiveLobby.players?.map(p => (p as any).nickName || (p as any).fullName).join(', ')
  })

  // Calculer les permissions utilisateur (avec type guard pour éviter les erreurs de type)
  const permissions = currentUser ? getLobbyPermissions(effectiveLobby as Lobby, currentUser) : null
  const isConnected = !!lobbyService && !error && !timeoutReached

  const handleLeaveLobby = async () => {
    if (!currentUser || !lobbyService || !permissions?.canLeave) {
      console.warn('🔧 LobbyStatusSidebar: Cannot leave lobby - missing requirements')
      return
    }
    
    console.log('🔧 LobbyStatusSidebar: Leaving lobby', { lobbyUuid: effectiveLobby.uuid })
    setIsLeavingLobby(true)
    try {
      await lobbyService.leaveLobby(effectiveLobby.uuid, currentUser.uuid)
      console.log('🔧 LobbyStatusSidebar: Successfully left lobby')
      toast.success('Vous avez quitté le lobby avec succès')
      // Le sidebar disparaîtra automatiquement car lobby deviendra null
    } catch (error) {
      console.error('🔧 LobbyStatusSidebar: Failed to leave lobby', error)
      toast.error('Erreur lors de la sortie du lobby')
    } finally {
      setIsLeavingLobby(false)
    }
  }

  const handleGoToLobby = () => {
    console.log('🔧 LobbyStatusSidebar: Navigating to lobby', { lobbyUuid: effectiveLobby.uuid })
    router.visit(`/lobbies/${effectiveLobby.uuid}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case LOBBY_STATUS.WAITING:
        return 'bg-blue-100 text-blue-800'
      case LOBBY_STATUS.READY:
        return 'bg-green-100 text-green-800'
      case LOBBY_STATUS.FULL:
        return 'bg-yellow-100 text-yellow-800'
      case LOBBY_STATUS.STARTING:
        return 'bg-purple-100 text-purple-800'
      case LOBBY_STATUS.IN_GAME:
        return 'bg-green-100 text-green-800'
      case LOBBY_STATUS.PAUSED:
        return 'bg-orange-100 text-orange-800'
      case LOBBY_STATUS.FINISHED:
        return 'bg-gray-100 text-gray-800'
      case LOBBY_STATUS.CANCELLED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case LOBBY_STATUS.WAITING:
        return 'En attente'
      case LOBBY_STATUS.READY:
        return 'Prêt'
      case LOBBY_STATUS.FULL:
        return 'Complet'
      case LOBBY_STATUS.STARTING:
        return 'Démarrage'
      case LOBBY_STATUS.IN_GAME:
        return 'En cours'
      case LOBBY_STATUS.PAUSED:
        return 'En pause'
      case LOBBY_STATUS.FINISHED:
        return 'Terminé'
      case LOBBY_STATUS.CANCELLED:
        return 'Annulé'
      default:
        return status
    }
  }

  return (
    <div className="fixed right-4 top-20 w-80 z-50">
      <Card className="border-l-4 border-l-blue-500 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lobby Actuel
            {isConnected ? (
              <div title="Connecté">
                <Wifi className="w-4 h-4 text-green-500" />
              </div>
            ) : (
              <div title="Déconnecté">
                <WifiOff className="w-4 h-4 text-red-500" />
              </div>
            )}
            {timeoutReached && (
              <div title="Timeout - données mises en cache">
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-2">{effectiveLobby.name}</h3>
            <div className="flex items-center justify-between mb-2">
              <Badge className={getStatusColor(effectiveLobby.status)}>
                {getStatusText(effectiveLobby.status)}
              </Badge>
              <span className="text-sm text-gray-600">
                {effectiveLobby.currentPlayers}/{effectiveLobby.maxPlayers} joueurs
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleGoToLobby}
              className="w-full"
              variant="default"
              disabled={!isConnected}
            >
              <Play className="h-4 w-4 mr-2" />
              Aller au lobby
            </Button>
            
            {permissions?.canLeave && (
              <Button 
                onClick={handleLeaveLobby}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                disabled={isLeavingLobby || !isConnected}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLeavingLobby ? 'Sortie...' : 'Quitter le lobby'}
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            💡 Vous êtes actuellement dans ce lobby. Vous devez le quitter avant de rejoindre un autre.
          </div>

          {!isConnected && (
            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Connexion temps réel indisponible - données mises en cache
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
