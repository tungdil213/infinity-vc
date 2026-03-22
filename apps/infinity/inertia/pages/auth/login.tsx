import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
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
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useI18n } from '../../i18n/use_i18n'

interface LoginProps {
  redirect?: string
  errors?: {
    email?: string[]
    password?: string[]
    general?: string[]
  }
  flash?: {
    error?: string
    success?: string
  }
}

export default function Login({ errors = {}, flash = {}, redirect = '/lobbies' }: LoginProps) {
  const { t } = useI18n()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    redirect,
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    router.post('/auth/login', formData, {
      onFinish: () => setIsLoading(false),
      onSuccess: () => {
        // Redirect will be handled by the server
      },
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <Layout>
      <Head title={t('auth.login.pageTitle')} />

      <div className="min-h-screen bg-secondary-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/">
              <h1 className="text-3xl font-heading text-foreground mb-2">♾️ infinity Game</h1>
            </Link>
          </div>

          {/* Flash Messages */}
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

          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('auth.login.title')}</CardTitle>
              <CardDescription>{t('auth.login.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.common.emailLabel')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('auth.common.emailPlaceholder')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.common.passwordLabel')}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('auth.common.passwordPlaceholder')}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password[0]}</p>
                  )}
                </div>

                {/* General Errors */}
                {errors.general && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.general[0]}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
                </Button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center">
                <Separator className="flex-1" />
                <span className="px-4 text-sm text-muted-foreground">{t('auth.login.noAccount')}</span>
                <Separator className="flex-1" />
              </div>

              {/* Sign Up Link */}
              <Link href="/auth/register">
                <Button variant="neutral" className="w-full">
                  {t('auth.login.createAccount')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="text-center space-y-2">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              {t('auth.common.backHome')}
            </Link>
            <div className="text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">
                {t('auth.login.forgotPassword')}
              </a>
              {' • '}
              <a href="#" className="hover:text-foreground">
                {t('auth.common.help')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
