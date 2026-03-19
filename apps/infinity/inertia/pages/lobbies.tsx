import React, { useState, useEffect } from 'react'
import { Head, router } from '@inertiajs/react'
import { LobbyList } from '@infinity.dev/ui/components/lobby-list'
import { LobbyData } from '@infinity.dev/ui/components/lobby-card'
import { LobbyPasswordDialog } from '@infinity.dev/ui/components/lobby-password-dialog'
import { HeaderWrapper } from '../layouts/HeaderWrapper'
import { Footer } from '@infinity.dev/ui/components/footer'
import { toast } from 'sonner'
import { useLobbyService } from '../hooks/use_lobby_service'
import { LobbyListState } from '../services/lobby_service'
import { useI18n } from '../i18n/use_i18n'

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
  hasPassword: boolean
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
    role?: 'PLAYER' | 'MODERATOR' | 'ADMIN'
  }
  currentLobby?: {
    uuid: string
    name: string
    status: string
    currentPlayers: number
    maxPlayers: number
  }
}

// Transform backend payload into LobbyData format
const transformLobbyData = (lobby: Lobby): LobbyData => ({
  uuid: lobby.uuid,
  name: lobby.name,
  description: lobby.description || `Lobby created by ${lobby.createdBy}`,
  status: lobby.status,
  currentPlayers: lobby.currentPlayers,
  maxPlayers: lobby.maxPlayers,
  isPrivate: lobby.isPrivate,
  hasPassword: lobby.hasPassword,
  hasAvailableSlots: lobby.hasAvailableSlots,
  creatorUuid: lobby.creatorUuid || lobby.createdBy,
  createdAt: lobby.createdAt,
  players: lobby.players.map((player) => ({
    ...player,
    isOnline: player.isOnline ?? true,
    isReady: player.isReady ?? false,
  })),
})

function LobbiesPage({ lobbies: initialLobbies, user, currentLobby }: LobbiesProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const { service: lobbyService } = useLobbyService()
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean
    lobbyUuid: string | null
    lobbyName: string
    error: string | null
  }>({
    open: false,
    lobbyUuid: null,
    lobbyName: '',
    error: null,
  })
  const [lobbyListState, setLobbyListState] = useState<LobbyListState>({
    lobbies: initialLobbies,
    loading: false,
    error: null,
    total: initialLobbies.length,
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (!lobbyService) return

    const unsubscribe = lobbyService.subscribeLobbyList((state) => {
      setLobbyListState(state)
    })

    // Initialize with server-side payload
    lobbyService.fetchLobbies()

    return () => {
      unsubscribe()
    }
  }, [lobbyService])

  // Always rely on LobbyService state (initialized with server payload)
  const lobbies = lobbyListState.lobbies

  const buildJsonHeaders = () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    if (csrfToken) {
      headers['X-CSRF-TOKEN'] = csrfToken
    }

    return headers
  }

  const lobbyNoun = (count: number) => (count === 1 ? 'lobby' : 'lobbies')

  const handleCreateLobby = () => {
    router.get('/lobbies/create')
  }

  const submitJoinLobby = async (
    lobbyUuid: string,
    options?: { password?: string; inlineError?: boolean }
  ) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/lobbies/${lobbyUuid}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: buildJsonHeaders(),
        body: JSON.stringify(options?.password ? { password: options.password } : {}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === 'string' ? payload.error : t('lobbies.unableJoin')
        if (options?.inlineError) {
          setPasswordDialog((prev) => ({ ...prev, error: errorMessage }))
          return
        }
        throw new Error(errorMessage)
      }

      setPasswordDialog({ open: false, lobbyUuid: null, lobbyName: '', error: null })
      toast.success(t('lobbies.joined'))
      router.visit(`/lobbies/${lobbyUuid}`)
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : t('lobbies.unexpectedError')
      if (options?.inlineError) {
        setPasswordDialog((prev) => ({ ...prev, error: fallbackMessage }))
        return
      }
      toast.error(fallbackMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinLobby = async (lobbyUuid: string) => {
    const targetLobby = lobbies.find((lobby) => lobby.uuid === lobbyUuid) as Lobby | undefined
    if (targetLobby?.hasPassword) {
      setPasswordDialog({
        open: true,
        lobbyUuid,
        lobbyName: targetLobby.name,
        error: null,
      })
      return
    }

    await submitJoinLobby(lobbyUuid)
  }

  const handleSubmitPassword = async (password: string) => {
    if (!passwordDialog.lobbyUuid) {
      return
    }

    await submitJoinLobby(passwordDialog.lobbyUuid, {
      password,
      inlineError: true,
    })
  }

  const handleLeaveLobby = async (lobbyUuid: string) => {
    try {
      router.post(
        `/lobbies/${lobbyUuid}/leave`,
        {},
        {
          onSuccess: () => {
            toast.success(t('lobbies.left'))
            router.reload()
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? (errors as any).error
                : t('lobbies.unableLeave')
            toast.error(errorMessage)
          },
        }
      )
    } catch (error) {
      toast.error(t('lobbies.unexpectedError'))
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
        toast.success(t('lobbies.linkCopied'))
      })
      .catch(() => {
        toast.error(t('lobbies.unableCopyLink'))
      })
  }

  const handleStartGame = async (lobbyUuid: string) => {
    try {
      router.post(
        `/lobbies/${lobbyUuid}/start`,
        {},
        {
          onSuccess: (page) => {
            toast.success(t('lobbies.gameStarted'))
            // Controller redirects to /games/{gameUuid}
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? (errors as any).error
                : t('lobbies.unableStartGame')
            toast.error(errorMessage)
          },
        }
      )
    } catch (error) {
      toast.error(t('lobbies.unexpectedError'))
    }
  }

  const handleKickPlayer = async (lobbyUuid: string, playerUuid: string) => {
    try {
      router.post(
        `/lobbies/${lobbyUuid}/kick`,
        { playerUuid },
        {
          onSuccess: () => {
            toast.success(t('lobbies.playerRemoved'))
            router.reload()
          },
          onError: (errors) => {
            const errorMessage =
              typeof errors === 'object' && errors !== null && 'error' in errors
                ? (errors as any).error
                : t('lobbies.unableRemovePlayer')
            toast.error(errorMessage)
          },
        }
      )
    } catch (error) {
      toast.error(t('lobbies.unexpectedError'))
    }
  }

  const handleCloseLobby = async (lobbyUuid: string) => {
    const confirmed = window.confirm(t('lobbies.closeConfirm'))
    if (!confirmed) {
      return
    }

    const reason = window.prompt(t('lobbies.closeReasonPrompt'), 'manual moderation cleanup')?.trim()

    try {
      setLoading(true)
      const res = await fetch(`/api/v1/lobbies/${lobbyUuid}/close`, {
        method: 'POST',
        credentials: 'include',
        headers: buildJsonHeaders(),
        body: JSON.stringify(reason ? { reason } : {}),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errorMessage =
          typeof payload?.error === 'string' ? payload.error : t('lobbies.unableClose')
        throw new Error(errorMessage)
      }

      toast.success(t('lobbies.closedByModeration'))
      router.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('lobbies.unableClose'))
    } finally {
      setLoading(false)
    }
  }

  const handleBulkCloseLobbies = async (lobbyUuids: string[], reason?: string) => {
    if (lobbyUuids.length === 0) {
      return
    }

    try {
      setLoading(true)
      const headers = buildJsonHeaders()
      const closeResults = await Promise.all(
        lobbyUuids.map(async (lobbyUuid) => {
          const response = await fetch(`/api/v1/lobbies/${lobbyUuid}/close`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(reason ? { reason } : {}),
          })
          const payload = await response.json().catch(() => ({}))
          return {
            lobbyUuid,
            ok: response.ok,
            error: typeof payload?.error === 'string' ? payload.error : t('lobbies.unknownError'),
          }
        })
      )

      const successCount = closeResults.filter((result) => result.ok).length
      const failedResults = closeResults.filter((result) => !result.ok)

      if (successCount > 0) {
        toast.success(`${successCount} ${lobbyNoun(successCount)} closed`)
      }
      if (failedResults.length > 0) {
        const firstError = failedResults[0]?.error ?? t('lobbies.unableCloseSome')
        toast.error(`${failedResults.length} failed: ${firstError}`)
      }

      if (successCount > 0) {
        router.reload()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('lobbies.bulkCloseFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    router.reload()
  }

  const headerUser = user.fullName
    ? {
        uuid: user.uuid,
        fullName: user.fullName,
        email: user.nickName,
      }
    : undefined

  const transformedLobbies = lobbies.map((lobby) => transformLobbyData(lobby as Lobby))
  const isRealTimeLoading = lobbyListState.loading

  return (
    <>
      <Head title="Game Lobbies" />

      <div className="min-h-screen bg-secondary-background">
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
            onClose={handleCloseLobby}
            onKick={handleKickPlayer}
            onCreateLobby={handleCreateLobby}
            onRefresh={handleRefresh}
            onBulkClose={handleBulkCloseLobbies}
          />
        </div>

        <Footer />
      </div>

      <LobbyPasswordDialog
        open={passwordDialog.open}
        lobbyName={passwordDialog.lobbyName}
        loading={loading}
        error={passwordDialog.error}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordDialog({ open: false, lobbyUuid: null, lobbyName: '', error: null })
            return
          }
          setPasswordDialog((prev) => ({ ...prev, open: true }))
        }}
        onSubmit={handleSubmitPassword}
      />
    </>
  )
}

// Apply global layout (with TransmitProvider) around this page
import Layout from '../layouts/layout'
;(LobbiesPage as any).layout = (page: React.ReactNode) => <Layout>{page}</Layout>

export default LobbiesPage
