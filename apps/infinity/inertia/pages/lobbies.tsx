import React, { useState, useEffect } from 'react'
import { Head, router } from '@inertiajs/react'
import { LobbyList } from '@infinity.dev/ui/components/lobby-list'
import { LobbyData } from '@infinity.dev/ui/components/lobby-card'
import { LobbyPasswordDialog } from '@infinity.dev/ui/components/lobby-password-dialog'
import { Badge } from '@infinity.dev/ui/primitives/badge'
import { Button } from '@infinity.dev/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
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

interface ActiveGame {
  gameUuid: string
  status: 'IN_PROGRESS' | 'PAUSED'
  gameType: string
  playerCount: number
  startedAt: string
  durationMs: number
  lobbyUuid: string | null
  persistedAt: string | null
}

interface LobbiesProps {
  lobbies: Lobby[]
  activeGames: ActiveGame[]
  user: {
    uuid: string
    nickName: string
    fullName?: string
    role?: 'PLAYER' | 'MODERATOR' | 'ADMIN'
  }
}

// Transform backend payload into LobbyData format
const transformLobbyData = (
  lobby: Lobby,
  t: (key: string, values?: Record<string, string | number>) => string
): LobbyData => ({
  uuid: lobby.uuid,
  name: lobby.name,
  description:
    lobby.description || t('lobbies.createdByDescription', { createdBy: lobby.createdBy }),
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

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function toReadableDate(rawDate: string): string {
  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString()
}

function LobbiesPage({ lobbies: initialLobbies, activeGames, user }: LobbiesProps) {
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
      'Accept': 'application/json',
    }

    if (csrfToken) {
      headers['X-CSRF-TOKEN'] = csrfToken
    }

    return headers
  }

  const lobbyNoun = (count: number) =>
    count === 1 ? t('lobbies.lobbySingular') : t('lobbies.lobbyPlural')

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
      const fallbackMessage = error instanceof Error ? error.message : t('lobbies.unexpectedError')
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
          onSuccess: () => {
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

    const reason = window
      .prompt(t('lobbies.closeReasonPrompt'), t('lobbies.defaultModerationReason'))
      ?.trim()

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
        toast.success(
          t('lobbies.bulkClosedCount', {
            count: successCount,
            lobbyNoun: lobbyNoun(successCount),
          })
        )
      }
      if (failedResults.length > 0) {
        const firstError = failedResults[0]?.error ?? t('lobbies.unableCloseSome')
        toast.error(
          t('lobbies.bulkFailedCount', {
            count: failedResults.length,
            error: firstError,
          })
        )
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

  const handleResumeGame = (gameUuid: string) => {
    router.visit(`/games/${gameUuid}/resume`)
  }

  const activeGameStatusClasses: Record<ActiveGame['status'], string> = {
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    PAUSED: 'bg-amber-100 text-amber-800',
  }
  const activeGameStatusLabels: Record<ActiveGame['status'], string> = {
    IN_PROGRESS: t('profile.status.inProgress'),
    PAUSED: t('profile.status.paused'),
  }

  const transformedLobbies = lobbies.map((lobby) => transformLobbyData(lobby as Lobby, t))
  const isRealTimeLoading = lobbyListState.loading

  return (
    <>
      <Head title={t('lobbies.pageTitle')} />

      <div className="flex-1 bg-secondary-background">
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('lobbies.activeGamesTitle')}</CardTitle>
              <CardDescription>{t('lobbies.activeGamesSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              {activeGames.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('lobbies.noActiveGames')}</p>
              ) : (
                <div className="space-y-3">
                  {activeGames.map((game) => (
                    <div
                      key={game.gameUuid}
                      className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {t('profile.gameTypeLabel')}: {game.gameType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('profile.startedAtLabel')}: {toReadableDate(game.startedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('profile.durationLabel')}: {formatDuration(game.durationMs)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={activeGameStatusClasses[game.status]}>
                          {activeGameStatusLabels[game.status]}
                        </Badge>
                        <Badge variant="neutral">
                          {game.playerCount} {t('createLobby.playersSuffix')}
                        </Badge>
                        <Button size="sm" onClick={() => handleResumeGame(game.gameUuid)}>
                          {t('lobbies.resumeGameAction')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
            labels={{
              loadingErrorTitle: t('lobbyList.loadingErrorTitle'),
              retry: t('lobbyList.retry'),
              heading: t('lobbyList.availableHeading'),
              totalSummary: t('lobbyList.totalSummary'),
              createLobby: t('lobbyList.createLobby'),
              filtersTitle: t('lobbyList.filtersTitle'),
              searchLabel: t('lobbyList.searchLabel'),
              searchPlaceholder: t('lobbyList.searchPlaceholder'),
              statusLabel: t('lobbyList.statusLabel'),
              statusAll: t('lobbyList.statusAll'),
              statusWaiting: t('lobbyList.statusWaiting'),
              statusReady: t('lobbyList.statusReady'),
              statusFull: t('lobbyList.statusFull'),
              statusInGame: t('lobbyList.statusInGame'),
              sortByLabel: t('lobbyList.sortByLabel'),
              sortCreated: t('lobbyList.sortCreated'),
              sortName: t('lobbyList.sortName'),
              sortPlayers: t('lobbyList.sortPlayers'),
              availableSlots: t('lobbyList.availableSlots'),
              playersSuffix: t('createLobby.playersSuffix'),
              privateProtectedOnly: t('lobbyList.privateProtectedOnly'),
              privateBadge: t('joinLobby.privateBadge'),
              protectedBadge: t('joinLobby.protectedBadge'),
              moderationViewTitle: t('lobbyList.moderationViewTitle'),
              moderationBadgeSuffix: t('lobbyList.moderationBadgeSuffix'),
              showAll: t('lobbyList.showAll'),
              showSensitive: t('lobbyList.showSensitive'),
              showJoinable: t('lobbyList.showJoinable'),
              sensitiveLobbies: t('lobbyList.sensitiveLobbies'),
              selectAll: t('lobbyList.selectAll'),
              clear: t('lobbyList.clear'),
              noSensitiveLobbies: t('lobbyList.noSensitiveLobbies'),
              bulkAction: t('lobbyList.bulkAction'),
              selectedSummary: t('lobbyList.selectedSummary'),
              reasonLabel: t('lobbyList.reasonLabel'),
              reasonPlaceholder: t('lobbyList.reasonPlaceholder'),
              closing: t('lobbyList.closing'),
              closeSelection: t('lobbyList.closeSelection'),
              bulkCloseConfirm: t('lobbyList.bulkCloseConfirm'),
              noLobbyFoundTitle: t('lobbyList.noLobbyFoundTitle'),
              noLobbiesCreated: t('lobbyList.noLobbiesCreated'),
              noLobbyMatches: t('lobbyList.noLobbyMatches'),
              createFirstLobby: t('lobbyList.createFirstLobby'),
              showingSummary: t('lobbyList.showingSummary'),
              withOpenSlots: t('lobbyList.withOpenSlots'),
              readyToStart: t('lobbyList.readyToStart'),
              hostLabel: t('lobbyList.hostLabel'),
              hostFallback: t('lobbyList.hostFallback'),
              playersLabel: t('lobbyList.playersLabel'),
              viewDetails: t('lobbyList.viewDetails'),
              joinActionLabel: t('lobbyList.joinActionLabel'),
              startLabel: t('lobbyList.startLabel'),
              leaveLabel: t('lobbyList.leaveLabel'),
              closeLabel: t('lobbyList.closeLabel'),
              closeLobbyLabel: t('lobbyList.closeLobbyLabel'),
              lobbySingular: t('lobbies.lobbySingular'),
              lobbyPlural: t('lobbies.lobbyPlural'),
              defaultBulkReason: t('lobbies.defaultModerationReason'),
            }}
          />
        </div>
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
        labels={{
          title: t('passwordDialog.title'),
          descriptionWithLobby: t('passwordDialog.descriptionWithLobby'),
          descriptionWithoutLobby: t('passwordDialog.descriptionWithoutLobby'),
          passwordLabel: t('passwordDialog.passwordLabel'),
          passwordPlaceholder: t('passwordDialog.passwordPlaceholder'),
          passwordRequired: t('passwordDialog.passwordRequired'),
          cancel: t('passwordDialog.cancel'),
          join: t('passwordDialog.join'),
          joining: t('passwordDialog.joining'),
        }}
      />
    </>
  )
}

// Apply global layout (with TransmitProvider) around this page
import Layout from '../layouts/layout'
;(LobbiesPage as any).layout = (page: React.ReactNode) => <Layout>{page}</Layout>

export default LobbiesPage
