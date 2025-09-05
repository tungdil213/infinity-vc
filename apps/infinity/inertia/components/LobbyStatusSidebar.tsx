import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@tyfo.dev/ui/primitives/card'
import { Badge } from '@tyfo.dev/ui/primitives/badge'
import { Users, LogOut, Play } from 'lucide-react'
import { toast } from 'sonner'
import { useLobbyDetail } from '../hooks/use_lobby_detail'
import { useLobbyService } from '../hooks/use_lobby_service'

interface LobbyStatusSidebarProps {
  currentLobby: {
    uuid: string
    name: string
    status: string
    currentPlayers: number
    maxPlayers: number
  } | null
  currentUser?: {
    uuid: string
    fullName: string
  }
}

export function LobbyStatusSidebar({ currentLobby, currentUser }: LobbyStatusSidebarProps) {
  const { service: lobbyService, isConnected } = useLobbyService()
  const [isLeavingLobby, setIsLeavingLobby] = useState(false)

  // Ne pas afficher le sidebar si pas de lobby
  if (!currentLobby) {
    return null
  }

  const handleLeaveLobby = async () => {
    if (!currentUser || !isConnected || !lobbyService) return
    
    setIsLeavingLobby(true)
    try {
      await lobbyService.leaveLobby(currentLobby.uuid, currentUser.uuid)
      toast.success('Vous avez quitté le lobby avec succès')
      // Le sidebar disparaîtra automatiquement car lobby deviendra null
    } catch (error) {
      console.error('Failed to leave lobby:', error)
      toast.error('Erreur lors de la sortie du lobby')
    } finally {
      setIsLeavingLobby(false)
    }
  }

  const handleGoToLobby = () => {
    router.visit(`/lobbies/${currentLobby.uuid}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-500'
      case 'playing':
        return 'bg-green-500'
      case 'finished':
        return 'bg-gray-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'En attente'
      case 'playing':
        return 'En cours'
      case 'finished':
        return 'Terminé'
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
            {!isConnected && (
              <div className="w-2 h-2 bg-red-500 rounded-full" title="Déconnecté" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-2">{currentLobby.name}</h3>
            <div className="flex items-center justify-between mb-2">
              <Badge className={`${getStatusColor(currentLobby.status)} text-white`}>
                {getStatusText(currentLobby.status)}
              </Badge>
              <span className="text-sm text-gray-600">
                {currentLobby.currentPlayers}/{currentLobby.maxPlayers} joueurs
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
            
            <Button 
              onClick={handleLeaveLobby}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              disabled={isLeavingLobby || !isConnected}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLeavingLobby ? 'Sortie...' : 'Quitter le lobby'}
            </Button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            💡 Vous êtes actuellement dans ce lobby. Vous devez le quitter avant de rejoindre un autre.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
