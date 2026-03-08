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
  return (
    <Layout>
      <Head title="infinity Game - Multiplayer Gaming Platform" />

      <div className="min-h-screen bg-background text-foreground font-mono">
        {/* Enhanced Navigation */}
        <HeaderWrapper user={user} currentLobby={currentLobby} />

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-8">
                Play Multiplayer Games
                <span className="block text-primary">In Real Time</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
                Create lobbies, invite friends, and enjoy seamless multiplayer gaming with real-time
                updates. No downloads required - play directly in your browser!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <>
                    <Link href="/lobbies">
                      <Button size="lg">🎮 Browse Lobbies</Button>
                    </Link>
                    <Link href="/lobbies/create">
                      <Button size="lg" variant="reverse">
                        ➕ Create Lobby
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/register">
                      <Button size="lg">🚀 Get Started Free</Button>
                    </Link>
                    <Link href="#features">
                      <Button size="lg">📖 Learn More</Button>
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
                Why Choose infinity Game?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Built for modern multiplayer gaming with cutting-edge technology
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>Real-Time Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Experience seamless gameplay with instant updates using Server-Sent Events. No
                    lag, no delays - just smooth multiplayer action.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>Easy Lobby System</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Create private or public lobbies, invite friends with shareable links, and
                    manage your gaming sessions with ease.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>No Downloads</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Play instantly in your browser. No installations, no updates to manage. Just
                    click and play from any device.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>Secure & Private</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Your games are protected with JWT authentication and secure connections. Play
                    with confidence knowing your data is safe.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>Multiple Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Enjoy various card games and board games. More games are added regularly to keep
                    the fun going.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-main rounded-base border-2 border-border flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-main-foreground" />
                  </div>
                  <CardTitle>Performance First</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Built with modern technology for optimal performance. Fast loading, smooth
                    animations, and responsive design.
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
              Ready to Start Playing?
            </h2>
            <p className="text-xl text-main-foreground/80 mb-8 max-w-2xl mx-auto">
              Join thousands of players already enjoying multiplayer games on infinity Game
            </p>

            {user ? (
              <Link href="/lobbies">
                <Button size="lg" variant="reverse">
                  🎮 Go to Lobbies
                </Button>
              </Link>
            ) : (
              <Link href="/auth/register">
                <Button size="lg" variant="reverse">
                  🚀 Sign Up Now - It's Free!
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </Layout>
  )
}
