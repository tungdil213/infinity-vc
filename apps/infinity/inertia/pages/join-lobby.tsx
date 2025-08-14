import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'

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

export default function JoinLobby({ lobby, user, invitationCode, errors = {}, flash = {} }: JoinLobbyProps) {
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
        <Head title={`Join ${lobby.name} - Infinity Game`} />
        
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <Link href="/">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  ♾️ Infinity Game
                </h1>
              </Link>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h2>
              <p className="text-gray-600 mb-6">
                You've been invited to join <strong>{lobby.name}</strong>
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{lobby.name}</h3>
                {lobby.description && (
                  <p className="text-gray-600 text-sm mb-4">{lobby.description}</p>
                )}
                
                <div className="flex justify-center items-center gap-4 text-sm text-gray-600">
                  <span>{lobby.currentPlayers}/{lobby.maxPlayers} players</span>
                  {lobby.isPrivate && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                      🔒 Private
                    </span>
                  )}
                  {lobby.hasPassword && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                      🔑 Protected
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-center text-gray-600">
                  You need to sign in to join this lobby
                </p>
                
                <div className="space-y-3">
                  <Link href={`/auth/login?redirect=/lobbies/join/${invitationCode}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Sign In to Join
                    </Button>
                  </Link>
                  
                  <Link href={`/auth/register?redirect=/lobbies/join/${invitationCode}`}>
                    <Button variant="outline" className="w-full">
                      Create Account & Join
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
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
      <Head title={`Join ${lobby.name} - Infinity Game`} />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                ♾️ Infinity Game
              </h1>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h2>
            <p className="text-gray-600">
              Welcome {user.fullName}! You've been invited to join this lobby.
            </p>
          </div>

          {/* Flash Messages */}
          {flash.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {flash.error}
            </div>
          )}
          
          {flash.success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {flash.success}
            </div>
          )}

          {/* Lobby Info */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{lobby.name}</h3>
              {lobby.description && (
                <p className="text-gray-600 mb-4">{lobby.description}</p>
              )}
              
              <div className="flex justify-center items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="font-medium">{lobby.currentPlayers}/{lobby.maxPlayers} players</span>
                {lobby.isPrivate && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                    🔒 Private
                  </span>
                )}
                {lobby.hasPassword && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                    🔑 Protected
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Created {new Date(lobby.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Join Form */}
            <form onSubmit={handleJoin} className="space-y-4">
              {lobby.hasPassword && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Lobby Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter lobby password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>
                  )}
                </div>
              )}

              {/* General Errors */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {errors.general[0]}
                </div>
              )}

              {/* Join Status */}
              {!lobby.hasAvailableSlots ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-center">
                  <p className="font-medium">Lobby is Full</p>
                  <p className="text-sm">This lobby has reached its maximum capacity.</p>
                </div>
              ) : (
                <Button
                  type="submit"
                  disabled={isJoining}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium"
                >
                  {isJoining ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Joining Lobby...
                    </div>
                  ) : (
                    '🎮 Join Lobby'
                  )}
                </Button>
              )}
            </form>

            <div className="mt-6 text-center">
              <Link href="/lobbies">
                <Button variant="outline" className="w-full">
                  Browse Other Lobbies
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-center space-y-2">
            <Link href="/lobbies" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to Lobbies
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
