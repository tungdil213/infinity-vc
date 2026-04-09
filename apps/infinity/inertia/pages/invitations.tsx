import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { Button } from '@infinity.dev/ui/primitives/button'
import { Input } from '@infinity.dev/ui/primitives/input'
import { Label } from '@infinity.dev/ui/primitives/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import { Alert, AlertDescription } from '@infinity.dev/ui/primitives/alert'
import { Badge } from '@infinity.dev/ui/primitives/badge'
import { AlertCircle, CheckCircle2, Copy } from 'lucide-react'
import Layout from '../layouts/layout'
import { useI18n } from '../i18n/use_i18n'

interface InvitationItem {
  uuid: string
  status: 'active' | 'used' | 'expired' | 'revoked'
  expiresAt: string | null
  maxUses: number
  usedCount: number
  restrictedEmail: string | null
  usedByUserUuid: string | null
  usedAt: string | null
  revokedAt: string | null
  createdAt: string
}

interface InvitationsPageProps {
  invitations: InvitationItem[]
  flash?: {
    error?: string
    success?: string
    generatedInvitationCode?: string
  }
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

function toStatusVariant(status: InvitationItem['status']) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'used':
      return 'bg-blue-100 text-blue-800'
    case 'expired':
      return 'bg-amber-100 text-amber-800'
    case 'revoked':
      return 'bg-slate-100 text-slate-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function InvitationsPage({ invitations, flash = {} }: InvitationsPageProps) {
  const { t } = useI18n()
  const [restrictedEmail, setRestrictedEmail] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = (event: React.FormEvent) => {
    event.preventDefault()
    setIsGenerating(true)

    router.post(
      '/invitations',
      { restrictedEmail },
      {
        preserveScroll: true,
        preserveState: true,
        onFinish: () => setIsGenerating(false),
        onSuccess: () => setRestrictedEmail(''),
      }
    )
  }

  const copyGeneratedCode = async () => {
    if (!flash.generatedInvitationCode) {
      return
    }

    await navigator.clipboard.writeText(flash.generatedInvitationCode)
  }

  return (
    <Layout>
      <Head title={t('invitations.pageTitle')} />

      <div className="flex-1 bg-secondary-background">
        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-heading text-foreground">{t('invitations.heading')}</h1>
              <p className="mt-1 text-muted-foreground">{t('invitations.subtitle')}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="neutral" onClick={() => router.visit('/friends')}>
                {t('invitations.openFriends')}
              </Button>
              <Button onClick={() => router.visit('/profile')}>{t('invitations.backToProfile')}</Button>
            </div>
          </section>

          {flash.error && (
            <Alert className="border-red-500 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{flash.error}</AlertDescription>
            </Alert>
          )}

          {flash.success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{flash.success}</AlertDescription>
            </Alert>
          )}

          {flash.generatedInvitationCode && (
            <Alert className="border-main/40 bg-main/5">
              <AlertDescription className="flex flex-col gap-3 text-foreground sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{t('invitations.generatedCodeLabel')}</p>
                  <p className="font-mono text-base">{flash.generatedInvitationCode}</p>
                </div>
                <Button variant="neutral" onClick={copyGeneratedCode}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t('invitations.copyCode')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('invitations.generateTitle')}</CardTitle>
                <CardDescription>{t('invitations.generateSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleGenerate}
                  className="flex flex-col gap-4 sm:flex-row sm:items-end"
                >
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="restrictedEmail">{t('invitations.restrictedEmailLabel')}</Label>
                    <Input
                      id="restrictedEmail"
                      name="restrictedEmail"
                      type="email"
                      value={restrictedEmail}
                      onChange={(event) => setRestrictedEmail(event.target.value)}
                      placeholder={t('invitations.restrictedEmailPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('invitations.restrictedEmailHint')}
                    </p>
                  </div>

                  <Button type="submit" disabled={isGenerating}>
                    {isGenerating ? t('invitations.generating') : t('invitations.generateAction')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('invitations.listTitle')}</CardTitle>
                <CardDescription>{t('invitations.listSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {invitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('invitations.emptyState')}</p>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.uuid}
                        className="flex flex-col gap-3 rounded-lg border border-border p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={toStatusVariant(invitation.status)}>
                                {t(`invitations.status.${invitation.status}`)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {t('invitations.createdAtLabel', {
                                  date: toReadableDate(invitation.createdAt),
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {t('invitations.usageLabel', {
                                used: invitation.usedCount,
                                total: invitation.maxUses,
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('invitations.expiresAtLabel', {
                                date: toReadableDate(invitation.expiresAt),
                              })}
                            </p>
                            {invitation.restrictedEmail && (
                              <p className="text-sm text-muted-foreground">
                                {t('invitations.restrictedEmailApplied', {
                                  email: invitation.restrictedEmail,
                                })}
                              </p>
                            )}
                          </div>

                          {invitation.status === 'active' && (
                            <Button
                              variant="neutral"
                              onClick={() => router.post(`/invitations/${invitation.uuid}/revoke`)}
                            >
                              {t('invitations.revokeAction')}
                            </Button>
                          )}
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
