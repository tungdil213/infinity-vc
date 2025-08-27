import React, { useState } from 'react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './primitives/dropdown-menu'
import { Button } from './primitives/button'
import { Badge } from './primitives/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './primitives/dialog'
import { Input } from './primitives/input'
import { Label } from './primitives/label'
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
  isConnected?: boolean
  className?: string
  onCreateLobby?: () => void
  onJoinByCode?: (code: string) => Promise<void>
  onGoToCurrentLobby?: () => void
  onGoToLobbies?: () => void
  onLogin?: () => void
  onRegister?: () => void
  onLogout?: () => void
  onProfile?: () => void
  onSettings?: () => void
  logoHref?: string
  logoText?: string
}

export function Header({ 
  user, 
  currentLobby, 
  isConnected = true,
  className = '',
  onCreateLobby,
  onJoinByCode,
  onGoToCurrentLobby,
  onGoToLobbies,
  onLogin,
  onRegister,
  onLogout,
  onProfile,
  onSettings,
  logoHref = "/",
  logoText = "♾️ Infinity Game"
}: HeaderProps) {
  const [lobbyCode, setLobbyCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleJoinByCode = async () => {
    if (!lobbyCode.trim() || !onJoinByCode) return
    
    setIsJoining(true)
    try {
      await onJoinByCode(lobbyCode.trim())
      setIsDialogOpen(false)
      setLobbyCode('')
    } catch (error) {
      console.error('Failed to join lobby:', error)
    } finally {
      setIsJoining(false)
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
    <>
      <nav className={`bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a href={logoHref} className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
                  {logoText}
                </h1>
              </a>
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
                      onClick={onGoToCurrentLobby}
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
                      onClick={onCreateLobby}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Créer</span>
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Hash className="w-4 h-4" />
                          <span className="hidden sm:inline">Rejoindre</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Rejoindre un lobby</DialogTitle>
                          <DialogDescription>
                            Entrez le code du lobby pour le rejoindre.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="lobby-code">Code du lobby</Label>
                            <Input
                              id="lobby-code"
                              value={lobbyCode}
                              onChange={(e) => setLobbyCode(e.target.value)}
                              placeholder="Entrez le code du lobby"
                              onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleJoinByCode}
                            disabled={!lobbyCode.trim() || isJoining}
                            className="w-full"
                          >
                            {isJoining ? 'Connexion...' : 'Rejoindre'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Browse Lobbies */}
                  <Button onClick={onGoToLobbies} variant="outline" className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Lobbies</span>
                  </Button>

                  {/* Notifications */}
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-4 h-4" />
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
                      <DropdownMenuItem onClick={onProfile}>
                        <User className="w-4 h-4 mr-2" />
                        Profil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onSettings}>
                        <Settings className="w-4 h-4 mr-2" />
                        Paramètres
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  {/* Public Lobbies Preview */}
                  <Button onClick={onGoToLobbies} variant="ghost" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Voir les lobbies
                  </Button>

                  {/* Auth Buttons */}
                  <Button onClick={onLogin} variant="outline">
                    Connexion
                  </Button>
                  <Button onClick={onRegister}>
                    S'inscrire
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

    </>
  )
}
