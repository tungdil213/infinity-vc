import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
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
import { AlertCircle, CheckCircle2, Lock, Key, Users } from 'lucide-react'

interface JoinLobbyProps {
  lobby: {
    uuid: string
    name: string
    description?: string
    currentPlayers: number
    maxPlayers: number
    isPrivate: boolean
    hasPassword: boolean
    hasAvailableSlots: boolean
    createdBy: string
    createdAt: string
  }
  user?: {
    uuid: string
    fullName: string
  }
  invitationCode: string
  errors?: {
    password?: string[]
    general?: string[]
  }
  flash?: {
    error?: string
    success?: string
  }
}

export default function JoinLobby({
  lobby,
  user,
  invitationCode,
  errors = {},
  flash = {},
}: JoinLobbyProps) {
  const [password, setPassword] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsJoining(true)

    const joinData = {
      invitationCode,
      password: lobby.hasPassword ? password : undefined,
    }

    router.post(`/lobbies/join/${invitationCode}`, joinData, {
      onFinish: () => setIsJoining(false),
      onSuccess: () => {
        // Redirect will be handled by the server
      },
    })
  }

  if (!user) {
    return (
      <>
        <Head title={`Join ${lobby.name} - infinity Game`} />

        <div className="min-h-screen bg-secondary-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <Link href="/">
                <h1 className="text-3xl font-heading text-foreground mb-4">♾️ infinity Game</h1>
              </Link>
            </div>

            <Card>
              <CardHeader className="text-center">
                <CardTitle>You're Invited!</CardTitle>
                <CardDescription>
                  You've been invited to join <strong>{lobby.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-heading mb-2">{lobby.name}</h3>
                  {lobby.description && (
                    <p className="text-muted-foreground text-sm mb-4">{lobby.description}</p>
                  )}

                  <div className="flex justify-center items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {lobby.currentPlayers}/{lobby.maxPlayers}
                    </Badge>
                    {lobby.isPrivate && (
                      <Badge variant="secondary">
                        <Lock className="h-3 w-3 mr-1" /> Private
                      </Badge>
                    )}
                    {lobby.hasPassword && (
                      <Badge variant="secondary">
                        <Key className="h-3 w-3 mr-1" /> Protected
                      </Badge>
                    )}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>You need to sign in to join this lobby</AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Link href={`/auth/login?redirect=/lobbies/join/${invitationCode}`}>
                    <Button className="w-full">Sign In to Join</Button>
                  </Link>

                  <Link href={`/auth/register?redirect=/lobbies/join/${invitationCode}`}>
                    <Button variant="neutral" className="w-full">
                      Create Account & Join
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head title={`Join ${lobby.name} - infinity Game`} />

      <div className="min-h-screen bg-secondary-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/">
              <h1 className="text-3xl font-heading text-foreground mb-4">♾️ infinity Game</h1>
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

          {/* Lobby Info */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>You're Invited!</CardTitle>
              <CardDescription>
                Welcome {user.fullName}! You've been invited to join this lobby.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-heading mb-2">{lobby.name}</h3>
                {lobby.description && (
                  <p className="text-muted-foreground mb-4">{lobby.description}</p>
                )}

                <div className="flex justify-center items-center gap-2 flex-wrap mb-4">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {lobby.currentPlayers}/{lobby.maxPlayers}
                  </Badge>
                  {lobby.isPrivate && (
                    <Badge variant="secondary">
                      <Lock className="h-3 w-3 mr-1" /> Private
                    </Badge>
                  )}
                  {lobby.hasPassword && (
                    <Badge variant="secondary">
                      <Key className="h-3 w-3 mr-1" /> Protected
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Created {new Date(lobby.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Join Form */}
              <form onSubmit={handleJoin} className="space-y-4">
                {lobby.hasPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Lobby Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter lobby password"
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password[0]}</p>
                    )}
                  </div>
                )}

                {/* General Errors */}
                {errors.general && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.general[0]}</AlertDescription>
                  </Alert>
                )}

                {/* Join Status */}
                {!lobby.hasAvailableSlots ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Lobby is Full</strong> - This lobby has reached its maximum capacity.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button type="submit" disabled={isJoining} className="w-full">
                    {isJoining ? 'Joining Lobby...' : '🎮 Join Lobby'}
                  </Button>
                )}
              </form>

              <Link href="/lobbies">
                <Button variant="neutral" className="w-full">
                  Browse Other Lobbies
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="text-center">
            <Link href="/lobbies" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Lobbies
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
