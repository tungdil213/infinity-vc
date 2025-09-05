import React, { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Badge } from '@tyfo.dev/ui/primitives/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@tyfo.dev/ui/primitives/dropdown-menu'
import { 
  Users, 
  Plus, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Gamepad2,
  Wifi,
  WifiOff,
  Hash
} from 'lucide-react'
import { useTransmit } from '../contexts/TransmitContext'
import { useLobbyService } from '../hooks/use_lobby_service'

interface User {
  uuid: string
  fullName: string
  email: string
}

interface CurrentLobby {
  uuid: string
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
}

interface HeaderProps {
  user?: User
  currentLobby?: CurrentLobby
  className?: string
}

export function Header({ user, currentLobby, className = '' }: HeaderProps) {
  const { isConnected } = useTransmit()
  const { service: lobbyService } = useLobbyService()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [lobbyCode, setLobbyCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoinByCode = async () => {
    if (!lobbyCode.trim() || !user || !lobbyService) return
    
    setIsJoining(true)
    try {
      await lobbyService.joinLobby(lobbyCode.trim(), user.uuid)
      setShowJoinModal(false)
      setLobbyCode('')
      router.visit(`/lobbies/${lobbyCode.trim()}`)
    } catch (error) {
      console.error('Failed to join lobby:', error)
    } finally {
      setIsJoining(false)
    }
  }

  const handleCreateLobby = () => {
    router.visit('/lobbies/create')
  }

  const handleGoToCurrentLobby = () => {
    if (currentLobby) {
      router.visit(`/lobbies/${currentLobby.uuid}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500'
      case 'playing': return 'bg-green-500'
      case 'finished': return 'bg-gray-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <nav className={`bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
                ♾️ Infinity Game
              </h1>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2" title={isConnected ? "Connected" : "Disconnected"}>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </div>

            {user ? (
              <>
                {/* Current Lobby Indicator */}
                {currentLobby && (
                  <Button
                    onClick={handleGoToCurrentLobby}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(currentLobby.status)}`} />
                    <span className="hidden sm:inline">{currentLobby.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {currentLobby.currentPlayers}/{currentLobby.maxPlayers}
                    </Badge>
                  </Button>
                )}

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCreateLobby}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Créer</span>
                  </Button>

                  <Button
                    onClick={() => setShowJoinModal(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Hash className="w-4 h-4" />
                    <span className="hidden sm:inline">Rejoindre</span>
                  </Button>
                </div>

                {/* Browse Lobbies */}
                <Link href="/lobbies">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Lobbies</span>
                  </Button>
                </Link>

                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  {/* TODO: Add notification count badge */}
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="hidden md:inline">{user.fullName}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" />
                      Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      Paramètres
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/auth/logout" method="post">
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Public Lobbies Preview */}
                <Link href="/lobbies">
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Voir les lobbies
                  </Button>
                </Link>

                {/* Auth Buttons */}
                <Link href="/auth/login">
                  <Button variant="outline">
                    Connexion
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button>
                    S'inscrire
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Join Lobby Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Rejoindre un lobby</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Code du lobby
                </label>
                <input
                  type="text"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value)}
                  placeholder="Entrez le code du lobby"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleJoinByCode}
                  disabled={!lobbyCode.trim() || isJoining}
                  className="flex-1"
                >
                  {isJoining ? 'Connexion...' : 'Rejoindre'}
                </Button>
                <Button
                  onClick={() => {
                    setShowJoinModal(false)
                    setLobbyCode('')
                  }}
                  variant="outline"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
