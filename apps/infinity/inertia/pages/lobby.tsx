import React, { useEffect } from 'react'
import { Head, router } from '@inertiajs/react'
import { toast } from 'sonner'
import GameLobby from '../components/GameLobby'
import Layout from '../components/layout'
import { useTabDetection } from '../hooks/use_tab_detection'

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
  // Détecter les connexions multiples au même lobby
  const { hasMultipleTabs } = useTabDetection({
    storageKey: `lobby_${lobby.uuid}`,
    warningMessage: `Le lobby "${lobby.name}" est déjà ouvert dans un autre onglet. Cela peut causer des problèmes de synchronisation.`,
    onMultipleTabsDetected: () => {
      console.log(`🎮 Lobby: Connexions multiples détectées pour le lobby ${lobby.uuid}`)
    }
  })

  // Toast de bienvenue après création/redirection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('created') === 'true') {
      toast.success(`Lobby "${lobby.name}" créé avec succès !`)
      // Nettoyer l'URL sans recharger la page
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [lobby.name])

  return (
    <Layout>
      <Head title={`Lobby - ${lobby.name}`} />
      
      <div className="min-h-screen bg-gray-50">
        {hasMultipleTabs && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Attention :</strong> Ce lobby est ouvert dans plusieurs onglets. Cela peut causer des problèmes de synchronisation.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <GameLobby
          lobbyUuid={lobby.uuid}
          currentUser={user}
        />
      </div>
    </Layout>
  )
}
