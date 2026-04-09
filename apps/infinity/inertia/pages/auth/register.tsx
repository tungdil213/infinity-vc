import { useMemo, useState } from 'react'
import { Link } from '@adonisjs/inertia/react'
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
import { Separator } from '@infinity.dev/ui/primitives/separator'
import Layout from '../../layouts/layout'
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useI18n } from '../../i18n/use_i18n'

interface RegisterProps {
  redirect?: string
  invitationCode?: string
  errors?: {
    invitationCode?: string[]
    fullName?: string[]
    email?: string[]
    password?: string[]
    password_confirmation?: string[]
    general?: string[]
  }
  flash?: {
    error?: string
    success?: string
  }
}

function getCsrfToken(): string | undefined {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? undefined
}

export default function Register({
  redirect = '/lobbies',
  invitationCode = '',
  errors = {},
  flash = {},
}: RegisterProps) {
  const { t } = useI18n()
  const [formData, setFormData] = useState({
    invitationCode,
    fullName: '',
    email: '',
    password: '',
    password_confirmation: '',
    redirect,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isValidatingInvitation, setIsValidatingInvitation] = useState(false)
  const [isInvitationValidated, setIsInvitationValidated] = useState(false)
  const [invitationValidationMessage, setInvitationValidationMessage] = useState<string | null>(
    null
  )
  const [invitationValidationError, setInvitationValidationError] = useState<string | null>(null)

  const canSubmit = useMemo(
    () => isInvitationValidated && !isValidatingInvitation && !isLoading,
    [isInvitationValidated, isValidatingInvitation, isLoading]
  )

  const validateInvitationCode = async () => {
    setIsValidatingInvitation(true)
    setInvitationValidationMessage(null)
    setInvitationValidationError(null)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      }
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const response = await fetch('/auth/register/validate-invitation', {
        method: 'POST',
        headers,
        body: JSON.stringify({ invitationCode: formData.invitationCode }),
      })

      const payload = (await response.json()) as {
        valid?: boolean
        message?: string
        invitation?: {
          issuerDisplayName?: string | null
        }
      }

      if (!response.ok || !payload.valid) {
        setIsInvitationValidated(false)
        setInvitationValidationError(
          payload.message ?? t('auth.register.invitationValidationFailed')
        )
        return
      }

      setIsInvitationValidated(true)
      setInvitationValidationMessage(
        payload.invitation?.issuerDisplayName
          ? t('auth.register.invitationValidatedWithIssuer', {
              issuer: payload.invitation.issuerDisplayName,
            })
          : t('auth.register.invitationValidated')
      )
    } catch {
      setIsInvitationValidated(false)
      setInvitationValidationError(t('auth.register.invitationValidationFailed'))
    } finally {
      setIsValidatingInvitation(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!isInvitationValidated) {
      setInvitationValidationError(t('auth.register.invitationMustBeValidated'))
      return
    }

    setIsLoading(true)

    router.post('/auth/register', formData, {
      preserveScroll: true,
      preserveState: true,
      onFinish: () => setIsLoading(false),
    })
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    if (name === 'invitationCode') {
      setIsInvitationValidated(false)
      setInvitationValidationMessage(null)
      setInvitationValidationError(null)
    }
  }

  return (
    <Layout>
      <Head title={t('auth.register.pageTitle')} />

      <div className="flex flex-1 items-center justify-center bg-secondary-background px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link href="/">
              <h1 className="mb-2 text-3xl font-heading text-foreground">♾️ infinity Game</h1>
            </Link>
          </div>

          {flash.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{flash.error}</AlertDescription>
            </Alert>
          )}

          {flash.success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{flash.success}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('auth.register.title')}</CardTitle>
              <CardDescription>{t('auth.register.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-main" />
                  <div>
                    <p className="font-medium text-foreground">
                      {t('auth.register.invitationGateTitle')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('auth.register.invitationGateDescription')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invitationCode">{t('auth.register.invitationCodeLabel')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invitationCode"
                      name="invitationCode"
                      type="text"
                      required
                      value={formData.invitationCode}
                      onChange={handleChange}
                      placeholder={t('auth.register.invitationCodePlaceholder')}
                      className={errors.invitationCode ? 'border-destructive' : ''}
                    />
                    <Button
                      type="button"
                      variant="neutral"
                      disabled={
                        isValidatingInvitation || formData.invitationCode.trim().length === 0
                      }
                      onClick={validateInvitationCode}
                    >
                      {isValidatingInvitation
                        ? t('auth.register.validatingInvitation')
                        : t('auth.register.validateInvitation')}
                    </Button>
                  </div>

                  {errors.invitationCode && (
                    <p className="text-sm text-destructive">{errors.invitationCode[0]}</p>
                  )}
                  {invitationValidationError && (
                    <p className="text-sm text-destructive">{invitationValidationError}</p>
                  )}
                  {invitationValidationMessage && (
                    <p className="text-sm text-green-700">{invitationValidationMessage}</p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.register.fullNameLabel')}</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    disabled={!isInvitationValidated}
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder={t('auth.register.fullNamePlaceholder')}
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
                    disabled={!isInvitationValidated}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('auth.common.emailPlaceholder')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.common.passwordLabel')}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    disabled={!isInvitationValidated}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('auth.register.passwordPlaceholder')}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password[0]}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{t('auth.register.passwordHint')}</p>
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
                    disabled={!isInvitationValidated}
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
                    className={errors.password_confirmation ? 'border-destructive' : ''}
                  />
                  {errors.password_confirmation && (
                    <p className="text-sm text-destructive">{errors.password_confirmation[0]}</p>
                  )}
                </div>

                {errors.general && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.general[0]}</AlertDescription>
                  </Alert>
                )}

                <div className="text-sm text-muted-foreground">
                  {t('auth.register.termsPrefix')}{' '}
                  <a href="#" className="text-main hover:underline">
                    {t('auth.register.termsOfService')}
                  </a>{' '}
                  {t('auth.register.termsAnd')}{' '}
                  <a href="#" className="text-main hover:underline">
                    {t('auth.register.privacyPolicy')}
                  </a>
                </div>

                <Button type="submit" disabled={!canSubmit} className="w-full">
                  {isLoading ? t('auth.register.submitting') : t('auth.register.submit')}
                </Button>
              </form>

              <div className="my-6 flex items-center">
                <Separator className="flex-1" />
                <span className="px-4 text-sm text-muted-foreground">
                  {t('auth.register.alreadyHaveAccount')}
                </span>
                <Separator className="flex-1" />
              </div>

              <Link href="/auth/login">
                <Button variant="neutral" className="w-full">
                  {t('auth.register.signInInstead')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="space-y-2 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              {t('auth.common.backHome')}
            </Link>
            <div className="text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">
                {t('auth.register.needHelp')}
              </a>
              {' • '}
              <a href="#" className="hover:text-foreground">
                {t('auth.register.contactSupport')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
