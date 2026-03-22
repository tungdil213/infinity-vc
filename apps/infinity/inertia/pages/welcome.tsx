import { Head, Link } from '@inertiajs/react'
import { Button } from '@infinity.dev/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import { Footer } from '@infinity.dev/ui/components/footer'
import Layout from '../layouts/layout'
import { HeaderWrapper } from '../layouts/HeaderWrapper'
import { Zap, Users, Globe, Shield, Heart, TrendingUp } from 'lucide-react'
import { useI18n } from '../i18n/use_i18n'

interface WelcomeProps {
  user?: {
    uuid: string
    fullName: string
    email: string
  }
  currentLobby?: {
    uuid: string
    name: string
    status: string
    currentPlayers: number
    maxPlayers: number
  }
}

export default function Welcome({ user, currentLobby }: WelcomeProps) {
  const { t } = useI18n()
  const footerSections = [
    {
      title: t('footer.quickLinks'),
      links: [
        { href: '/lobbies', label: t('footer.browseLobbies') },
        { href: '/auth/register', label: t('footer.signUp') },
        { href: '/auth/login', label: t('footer.login') },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { href: '#', label: t('footer.helpCenter') },
        { href: '#', label: t('footer.contactUs') },
        { href: '#', label: t('footer.privacyPolicy') },
      ],
    },
  ]

  return (
    <Layout>
      <Head title={t('welcome.pageTitle')} />

      <div className="min-h-screen bg-background text-foreground font-mono">
        {/* Enhanced Navigation */}
        <HeaderWrapper user={user} currentLobby={currentLobby} />

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-8">
                {t('welcome.heroTitle')}
                <span className="block text-primary">{t('welcome.heroTitleAccent')}</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
                {t('welcome.heroDescription')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <>
                    <Link href="/lobbies">
                      <Button size="lg">{t('welcome.browseLobbies')}</Button>
                    </Link>
                    <Link href="/lobbies/create">
                      <Button size="lg" variant="reverse">
                        {t('welcome.createLobby')}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/register">
                      <Button size="lg">{t('welcome.getStarted')}</Button>
                    </Link>
                    <Link href="#features">
                      <Button size="lg">{t('welcome.learnMore')}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-24 bg-secondary-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-heading text-foreground mb-4">
                {t('welcome.featuresTitle')}
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('welcome.featuresSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>{t('welcome.featureRealtimeTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {t('welcome.featureRealtimeDescription')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>{t('welcome.featureLobbyTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {t('welcome.featureLobbyDescription')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>{t('welcome.featureNoDownloadTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {t('welcome.featureNoDownloadDescription')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>{t('welcome.featureSecureTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {t('welcome.featureSecureDescription')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>{t('welcome.featureGamesTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {t('welcome.featureGamesDescription')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>{t('welcome.featurePerformanceTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {t('welcome.featurePerformanceDescription')}
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-main border-y-2 border-border py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-heading text-main-foreground mb-4">
              {t('welcome.ctaTitle')}
            </h2>
            <p className="text-xl text-main-foreground/80 mb-8 max-w-2xl mx-auto">
              {t('welcome.ctaDescription')}
            </p>

            {user ? (
              <Link href="/lobbies">
                <Button size="lg" variant="reverse">
                  {t('welcome.ctaLoggedIn')}
                </Button>
              </Link>
            ) : (
              <Link href="/auth/register">
                <Button size="lg" variant="reverse">
                  {t('welcome.ctaGuest')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <Footer
          description={t('footer.description')}
          sections={footerSections}
          copyright={t('footer.copyright')}
        />
      </div>
    </Layout>
  )
}
