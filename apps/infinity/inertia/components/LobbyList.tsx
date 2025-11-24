import React from 'react'
import { router } from '@inertiajs/react'
import {
  LobbyList as UILobbyList,
  type LobbyFilters,
} from '../../../../../packages/ui/src/components/lobby-list'
import type { LobbyData } from '../../../../../packages/ui/src/components/lobby-card'
import { useLobbyList } from '../hooks/use_lobby_list'
import { toast } from 'sonner'

console.log('🔧 LobbyList: Module loaded')

interface LobbyListWrapperProps {
  currentUser?: {
    uuid: string
    fullName: string
  }
  onCreateLobby?: () => void
  initialLobbies?: LobbyData[]
}

/**
 * Wrapper Inertia pour le composant UI LobbyList
 * Ajoute la logique métier (hooks, routing, toasts) au composant UI pur
 *
 * Pattern: UI Component (@tyfo.dev/ui) + Wrapper (logique Inertia)
 */
export default function LobbyListWrapper({
  currentUser,
  onCreateLobby,
  initialLobbies = [],
}: LobbyListWrapperProps) {
  console.log('🔧 LobbyListWrapper: Initializing', {
    hasUser: !!currentUser,
    initialCount: initialLobbies.length,
  })

  // ✅ Utiliser le hook avec les données Inertia comme fallback
  const {
    lobbies,
    loading,
    error,
    refresh,
    joinLobby: joinLobbyService,
  } = useLobbyList({}, initialLobbies)

  // ✅ Fallback gracieux: données temps réel OU données Inertia
  const effectiveLobbies = lobbies.length > 0 ? lobbies : initialLobbies

  // Handler pour rejoindre un lobby
  const handleJoin = async (lobbyUuid: string) => {
    if (!currentUser) {
      console.warn('🔧 LobbyListWrapper: Cannot join - no user')
      toast.error('Vous devez être connecté pour rejoindre un lobby')
      return
    }

    console.log('🔧 LobbyListWrapper: Joining lobby', { lobbyUuid, userUuid: currentUser.uuid })

    try {
      await joinLobbyService(lobbyUuid, currentUser.uuid)
      console.log('🔧 LobbyListWrapper: ✅ Successfully joined')

      // Naviguer vers la page du lobby
      router.visit(`/lobbies/${lobbyUuid}`)
      toast.success('Vous avez rejoint le lobby avec succès !')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Échec de la connexion au lobby'
      console.error('🔧 LobbyListWrapper: ❌ Join failed', err)
      toast.error(errorMessage)
    }
  }

  // Handler pour voir les détails d'un lobby
  const handleView = (lobbyUuid: string) => {
    console.log('🔧 LobbyListWrapper: Viewing lobby', { lobbyUuid })
    router.visit(`/lobbies/${lobbyUuid}`)
  }

  // Handler pour créer un lobby
  const handleCreate = () => {
    console.log('🔧 LobbyListWrapper: Creating lobby')
    if (onCreateLobby) {
      onCreateLobby()
    } else {
      router.visit('/lobbies/create')
    }
  }

  // Handler pour refresh
  const handleRefresh = () => {
    console.log('🔧 LobbyListWrapper: Refreshing lobbies')
    refresh()
  }

  // Handler pour les changements de filtres (optionnel, pour tracking)
  const handleFilterChange = (filters: LobbyFilters) => {
    console.log('🔧 LobbyListWrapper: Filters changed', filters)
  }

  // Adapter le format du currentUser pour correspondre à l'interface UI
  const uiCurrentUser = currentUser
    ? {
        uuid: currentUser.uuid,
        nickName: currentUser.fullName, // Adapter fullName → nickName
      }
    : undefined

  console.log('🔧 LobbyListWrapper: Rendering', {
    effectiveLobbiesCount: effectiveLobbies.length,
    loading,
    hasError: !!error,
  })

  return (
    <div className="max-w-7xl mx-auto p-6">
      <UILobbyList
        lobbies={effectiveLobbies}
        currentUser={uiCurrentUser}
        loading={loading}
        error={error || undefined}
        total={effectiveLobbies.length}
        onJoin={handleJoin}
        onView={handleView}
        onCreateLobby={handleCreate}
        onRefresh={handleRefresh}
        onFilterChange={handleFilterChange}
      />
    </div>
  )
}
