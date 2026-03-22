import { useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@infinity.dev/ui/primitives/select'
import { Alert, AlertDescription } from '@infinity.dev/ui/primitives/alert'
import Layout from '../layouts/layout'
import { useI18n } from '../i18n/use_i18n'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface SettingsPageProps {
  user: {
    uuid: string
    fullName: string
    email: string
    role?: 'PLAYER' | 'MODERATOR' | 'ADMIN'
    createdAt?: string | null
  }
  errors?: {
    fullName?: string[]
    email?: string[]
    currentPassword?: string[]
    password?: string[]
    password_confirmation?: string[]
  }
  flash?: {
    error?: string
    success?: string
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

export default function SettingsPage({
  user,
  errors = {},
  flash = {},
}: SettingsPageProps) {
  const { locale, setLocale, supportedLocales, t } = useI18n()
  const { props } = usePage()
  const currentLobby = props.currentLobby as { uuid?: string; name?: string } | null | undefined
  const currentLobbyUuid = typeof currentLobby?.uuid === 'string' ? currentLobby.uuid : undefined
  const [profileForm, setProfileForm] = useState({
    fullName: user.fullName,
    email: user.email,
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    password: '',
    password_confirmation: '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const handleProfileSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setIsSavingProfile(true)

    router.post('/settings/profile', profileForm, {
      preserveScroll: true,
      onFinish: () => setIsSavingProfile(false),
    })
  }

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setIsSavingPassword(true)

    router.post('/settings/password', passwordForm, {
      preserveScroll: true,
      onFinish: () => setIsSavingPassword(false),
      onSuccess: () => {
        setPasswordForm({
          currentPassword: '',
          password: '',
          password_confirmation: '',
        })
      },
    })
  }

  return (
    <Layout>
      <Head title={t('settings.pageTitle')} />

      <div className="flex-1 bg-secondary-background">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-heading text-foreground">{t('settings.heading')}</h1>
              <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {currentLobbyUuid && (
                <Button
                  variant="neutral"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => router.visit(`/lobbies/${currentLobbyUuid}`)}
                >
                  {t('sidebar.openLobby')}
                </Button>
              )}
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => router.visit('/lobbies')}
              >
                {t('header.lobbies')}
              </Button>
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

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profileSectionTitle')}</CardTitle>
                <CardDescription>{t('settings.profileSectionSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('auth.register.fullNameLabel')}</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={profileForm.fullName}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          fullName: event.target.value,
                        }))
                      }
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.common.emailLabel')}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
                  </div>

                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? t('settings.savingProfile') : t('settings.saveProfile')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.passwordSectionTitle')}</CardTitle>
                <CardDescription>{t('settings.passwordSectionSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('settings.currentPasswordLabel')}</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: event.target.value,
                        }))
                      }
                      className={errors.currentPassword ? 'border-destructive' : ''}
                    />
                    {errors.currentPassword && (
                      <p className="text-sm text-destructive">{errors.currentPassword[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{t('settings.newPasswordLabel')}</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={passwordForm.password}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password_confirmation">
                      {t('auth.register.confirmPasswordLabel')}
                    </Label>
                    <Input
                      id="password_confirmation"
                      name="password_confirmation"
                      type="password"
                      required
                      value={passwordForm.password_confirmation}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          password_confirmation: event.target.value,
                        }))
                      }
                      className={errors.password_confirmation ? 'border-destructive' : ''}
                    />
                    {errors.password_confirmation && (
                      <p className="text-sm text-destructive">
                        {errors.password_confirmation[0]}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={isSavingPassword}>
                    {isSavingPassword ? t('settings.savingPassword') : t('settings.savePassword')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.preferencesTitle')}</CardTitle>
                <CardDescription>{t('settings.preferencesSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>{t('common.language')}</Label>
                <Select
                  value={locale}
                  onValueChange={(value) => {
                    const nextLocale = supportedLocales.find((candidate) => candidate === value)
                    if (nextLocale) {
                      setLocale(nextLocale)
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder={t('common.language')} />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLocales.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`language.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('settings.languageHint')}</p>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.accountMetadataTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.role')}</p>
                  <p className="font-medium">{user.role ?? 'PLAYER'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.memberSince')}</p>
                  <p className="font-medium">{toReadableDate(user.createdAt)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">{t('settings.accountIdLabel')}</p>
                  <p className="font-mono text-sm break-all">{user.uuid}</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </Layout>
  )
}
