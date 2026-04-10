import { Head, router } from '@inertiajs/react'
import { Badge } from '@infinity.dev/ui/primitives/badge'
import { Button } from '@infinity.dev/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import { Input } from '@infinity.dev/ui/primitives/input'
import { useState } from 'react'
import { useI18n } from '../i18n/use_i18n'
import Layout from '../layouts/layout'

interface FriendItem {
  uuid: string
  friendUserUuid: string
  friendDisplayName: string
  createdAt: string
}

interface FriendRequestItem {
  uuid: string
  requesterUserUuid: string
  requesterDisplayName: string
  recipientUserUuid: string
  recipientDisplayName: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  createdAt: string
}

interface FriendSearchItem {
  userUuid: string
  displayName: string
  isFriend: boolean
  hasIncomingRequest: boolean
  hasOutgoingRequest: boolean
  canReceiveFriendRequests: boolean
}

interface FriendsPageProps {
  friends: FriendItem[]
  incomingRequests: FriendRequestItem[]
  outgoingRequests: FriendRequestItem[]
  searchResults: FriendSearchItem[]
  searchQuery?: string
}

function toReadableDate(rawDate: string): string {
  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString()
}

export default function FriendsPage({
  friends,
  incomingRequests,
  outgoingRequests,
  searchResults,
  searchQuery = '',
}: FriendsPageProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState(searchQuery)

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    router.get('/friends', { q: query }, { preserveState: true, preserveScroll: true })
  }

  return (
    <Layout>
      <Head title={t('friends.pageTitle')} />

      <div className="flex-1 bg-secondary-background">
        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-heading text-foreground">{t('friends.heading')}</h1>
              <p className="mt-1 text-muted-foreground">{t('friends.subtitle')}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="neutral" onClick={() => router.visit('/invitations')}>
                {t('friends.openInvitations')}
              </Button>
              <Button onClick={() => router.visit('/profile')}>{t('friends.backToProfile')}</Button>
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('friends.searchTitle')}</CardTitle>
                <CardDescription>{t('friends.searchSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('friends.searchPlaceholder')}
                  />
                  <Button type="submit">{t('friends.searchAction')}</Button>
                </form>

                {searchQuery && (
                  <div className="space-y-3">
                    {searchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('friends.searchEmptyState')}
                      </p>
                    ) : (
                      searchResults.map((candidate) => (
                        <div
                          key={candidate.userUuid}
                          className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium text-foreground">{candidate.displayName}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {candidate.isFriend && (
                              <Badge variant="neutral">{t('friends.alreadyFriendsBadge')}</Badge>
                            )}
                            {candidate.hasIncomingRequest && (
                              <Badge variant="neutral">{t('friends.incomingRequestBadge')}</Badge>
                            )}
                            {candidate.hasOutgoingRequest && (
                              <Badge variant="neutral">{t('friends.outgoingRequestBadge')}</Badge>
                            )}
                            {!candidate.isFriend &&
                              !candidate.hasIncomingRequest &&
                              !candidate.hasOutgoingRequest &&
                              !candidate.canReceiveFriendRequests && (
                                <Badge variant="neutral">
                                  {t('friends.protectedAccountBadge')}
                                </Badge>
                              )}
                            {!candidate.isFriend &&
                              !candidate.hasIncomingRequest &&
                              !candidate.hasOutgoingRequest &&
                              candidate.canReceiveFriendRequests && (
                                <Button
                                  variant="neutral"
                                  onClick={() =>
                                    router.post('/friends/requests', {
                                      recipientUserUuid: candidate.userUuid,
                                    })
                                  }
                                >
                                  {t('friends.sendRequestAction')}
                                </Button>
                              )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('friends.incomingTitle')}</CardTitle>
                <CardDescription>{t('friends.incomingSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {incomingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('friends.incomingEmptyState')}</p>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((requestItem) => (
                      <div key={requestItem.uuid} className="rounded-lg border border-border p-4">
                        <p className="font-medium text-foreground">
                          {requestItem.requesterDisplayName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('friends.requestReceivedAt', {
                            date: toReadableDate(requestItem.createdAt),
                          })}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="neutral"
                            onClick={() =>
                              router.post(`/friends/requests/${requestItem.uuid}/accept`)
                            }
                          >
                            {t('friends.acceptAction')}
                          </Button>
                          <Button
                            variant="neutral"
                            onClick={() =>
                              router.post(`/friends/requests/${requestItem.uuid}/reject`)
                            }
                          >
                            {t('friends.rejectAction')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('friends.outgoingTitle')}</CardTitle>
                <CardDescription>{t('friends.outgoingSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {outgoingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('friends.outgoingEmptyState')}</p>
                ) : (
                  <div className="space-y-3">
                    {outgoingRequests.map((requestItem) => (
                      <div key={requestItem.uuid} className="rounded-lg border border-border p-4">
                        <p className="font-medium text-foreground">
                          {requestItem.recipientDisplayName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('friends.requestSentAt', {
                            date: toReadableDate(requestItem.createdAt),
                          })}
                        </p>
                        <div className="mt-3">
                          <Button
                            variant="neutral"
                            onClick={() =>
                              router.post(`/friends/requests/${requestItem.uuid}/cancel`)
                            }
                          >
                            {t('friends.cancelAction')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('friends.listTitle')}</CardTitle>
                <CardDescription>{t('friends.listSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('friends.listEmptyState')}</p>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <div
                        key={friend.uuid}
                        className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">{friend.friendDisplayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('friends.friendSince', { date: toReadableDate(friend.createdAt) })}
                          </p>
                        </div>

                        <Button
                          variant="neutral"
                          onClick={() => router.post(`/friends/${friend.friendUserUuid}/remove`)}
                        >
                          {t('friends.removeAction')}
                        </Button>
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
