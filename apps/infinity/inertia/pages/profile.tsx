import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '@infinity.dev/ui/primitives/button'
import { Badge } from '@infinity.dev/ui/primitives/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import Layout from '../layouts/layout'
import { useI18n } from '../i18n/use_i18n'

interface ProfileStats {
  totalGames: number
  activeGames: number
  completedGames: number
  wins: number
  losses: number
  draws: number
  abandoned: number
  winRate: number
  averageDurationMs: number
}

interface ProfileHistoryItem {
  gameUuid: string
  status: 'IN_PROGRESS' | 'PAUSED' | 'ABANDONED' | 'FINISHED' | 'ARCHIVED'
  result: 'win' | 'loss' | 'draw' | 'abandoned'
  gameType: string
  playerCount: number
  winnerUuid: string | null
  startedAt: string
  finishedAt: string | null
  durationMs: number
}

interface ProfilePageProps {
  user: {
    uuid: string
    fullName: string
    email: string
    role?: 'PLAYER' | 'MODERATOR' | 'ADMIN'
    createdAt?: string | null
  }
  stats: ProfileStats
  recentGames: ProfileHistoryItem[]
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

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

function toReadableDate(rawDate: string | null | undefined): string {
  if (!rawDate) {
    return '-'
  }

  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString()
}

function toStatusBadgeClass(status: ProfileHistoryItem['status']): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800'
    case 'PAUSED':
      return 'bg-amber-100 text-amber-800'
    case 'FINISHED':
      return 'bg-green-100 text-green-800'
    case 'ABANDONED':
      return 'bg-red-100 text-red-800'
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function toResultBadgeClass(result: ProfileHistoryItem['result']): string {
  switch (result) {
    case 'win':
      return 'bg-green-100 text-green-800'
    case 'loss':
      return 'bg-red-100 text-red-800'
    case 'draw':
      return 'bg-slate-100 text-slate-800'
    case 'abandoned':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function ProfilePage({ user, stats, recentGames }: ProfilePageProps) {
  const { t } = useI18n()

  const statusLabelByKey: Record<ProfileHistoryItem['status'], string> = {
    IN_PROGRESS: t('profile.status.inProgress'),
    PAUSED: t('profile.status.paused'),
    FINISHED: t('profile.status.finished'),
    ABANDONED: t('profile.status.abandoned'),
    ARCHIVED: t('profile.status.archived'),
  }

  const resultLabelByKey: Record<ProfileHistoryItem['result'], string> = {
    win: t('profile.result.win'),
    loss: t('profile.result.loss'),
    draw: t('profile.result.draw'),
    abandoned: t('profile.result.abandoned'),
  }

  return (
    <Layout>
      <Head title={t('profile.pageTitle')} />

      <div className="flex-1 bg-secondary-background">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <section className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading text-foreground">{t('profile.heading')}</h1>
              <p className="text-muted-foreground mt-1">{t('profile.subtitle')}</p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Link href="/settings" className="w-full sm:w-auto">
                <Button size="sm" variant="neutral" className="w-full sm:w-auto">
                  {t('profile.goToSettings')}
                </Button>
              </Link>
              <Link href="/lobbies" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto">
                  {t('profile.browseLobbies')}
                </Button>
              </Link>
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.accountTitle')}</CardTitle>
                <CardDescription>{t('profile.accountSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.fullName')}</p>
                  <p className="font-medium text-foreground">{user.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.email')}</p>
                  <p className="font-medium text-foreground">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.role')}</p>
                  <Badge variant="neutral" className="mt-1">
                    {user.role ?? 'PLAYER'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.memberSince')}</p>
                  <p className="font-medium text-foreground">{toReadableDate(user.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{t('profile.totalGames')}</p>
                <p className="text-2xl font-heading">{stats.totalGames}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{t('profile.winRate')}</p>
                <p className="text-2xl font-heading">{formatPercent(stats.winRate)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{t('profile.activeGames')}</p>
                <p className="text-2xl font-heading">{stats.activeGames}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{t('profile.averageGameDuration')}</p>
                <p className="text-2xl font-heading">{formatDuration(stats.averageDurationMs)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{t('profile.wins')}</p>
                <p className="text-2xl font-heading">{stats.wins}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{t('profile.losses')}</p>
                <p className="text-2xl font-heading">{stats.losses}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{t('profile.draws')}</p>
                <p className="text-2xl font-heading">{stats.draws}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{t('profile.abandonedGames')}</p>
                <p className="text-2xl font-heading">{stats.abandoned}</p>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.recentGamesTitle')}</CardTitle>
                <CardDescription>{t('profile.recentGamesSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {recentGames.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('profile.noRecentGames')}</p>
                ) : (
                  <div className="space-y-3">
                    {recentGames.map((game) => (
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
                          <Badge className={toStatusBadgeClass(game.status)}>
                            {statusLabelByKey[game.status]}
                          </Badge>
                          <Badge className={toResultBadgeClass(game.result)}>
                            {resultLabelByKey[game.result]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </Layout>
  )
}
