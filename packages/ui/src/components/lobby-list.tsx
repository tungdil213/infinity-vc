import React, { useState } from 'react'
import { cn } from '../utils'
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card'
import { Button } from './primitives/button'
import { Input } from './primitives/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './primitives/select'
import { Switch } from './primitives/switch'
import { Label } from './primitives/label'
import { Badge } from './primitives/badge'
import { Skeleton } from './primitives/skeleton'
import { LobbyCard, LobbyData } from './lobby-card'
import { Search, Filter, Grid, List, Plus, RefreshCw } from 'lucide-react'

export interface LobbyListProps {
  lobbies: LobbyData[]
  currentUser?: {
    uuid: string
    nickName: string
  }
  loading?: boolean
  error?: string
  total?: number
  onJoin?: (lobbyUuid: string) => void
  onLeave?: (lobbyUuid: string) => void
  onView?: (lobbyUuid: string) => void
  onShare?: (lobbyUuid: string) => void
  onStart?: (lobbyUuid: string) => void
  onKick?: (lobbyUuid: string, playerUuid: string) => void
  onSettings?: (lobbyUuid: string) => void
  onCreateLobby?: () => void
  onRefresh?: () => void
  onFilterChange?: (filters: LobbyFilters) => void
  className?: string
}

export interface LobbyFilters {
  search?: string
  status?: 'all' | 'WAITING' | 'READY' | 'FULL' | 'IN_GAME'
  hasSlots?: boolean
  isPrivate?: boolean
  sortBy?: 'name' | 'created' | 'players'
  sortOrder?: 'asc' | 'desc'
}

export function LobbyList({
  lobbies,
  currentUser,
  loading = false,
  error,
  total,
  onJoin,
  onLeave,
  onView,
  onShare,
  onStart,
  onKick,
  onSettings,
  onCreateLobby,
  onRefresh,
  onFilterChange,
  className,
}: LobbyListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<LobbyFilters>({
    search: '',
    status: 'all',
    hasSlots: false,
    isPrivate: false,
    sortBy: 'created',
    sortOrder: 'desc',
  })

  const handleFilterChange = (newFilters: Partial<LobbyFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFilterChange?.(updatedFilters)
  }

  const filteredLobbies = lobbies.filter(lobby => {
    console.log('LobbyList - filtrage lobby:', lobby.name, 'filters:', filters)
    if (filters.search && !lobby.name.toLowerCase().includes(filters.search.toLowerCase())) {
      console.log('LobbyList - rejeté par search:', lobby.name)
      return false
    }
    if (filters.status !== 'all' && lobby.status !== filters.status) {
      console.log('LobbyList - rejeté par status:', lobby.status, 'vs', filters.status)
      return false
    }
    if (filters.hasSlots && !lobby.hasAvailableSlots) {
      console.log('LobbyList - rejeté par hasSlots:', lobby.hasAvailableSlots)
      return false
    }
    if (filters.isPrivate !== undefined && lobby.isPrivate !== filters.isPrivate) {
      console.log('LobbyList - rejeté par isPrivate:', lobby.isPrivate, 'vs', filters.isPrivate)
      return false
    }
    console.log('LobbyList - lobby accepté:', lobby.name)
    return true
  })

  const sortedLobbies = [...filteredLobbies].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (filters.sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'players':
        aValue = a.currentPlayers
        bValue = b.currentPlayers
        break
      case 'created':
      default:
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
    }

    if (filters.sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-4">
            <h3 className="text-lg font-medium">Erreur de chargement</h3>
            <p className="text-sm">{error}</p>
          </div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lobbies</h2>
          {total !== undefined && (
            <p className="text-sm text-gray-600">
              {filteredLobbies.length} sur {total} lobbies
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          )}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {onCreateLobby && (
            <Button onClick={onCreateLobby}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un lobby
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nom du lobby..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange({ status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="WAITING">En attente</SelectItem>
                  <SelectItem value="READY">Prêt</SelectItem>
                  <SelectItem value="FULL">Complet</SelectItem>
                  <SelectItem value="IN_GAME">En jeu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <Label>Trier par</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange({ sortBy: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Date de création</SelectItem>
                  <SelectItem value="name">Nom</SelectItem>
                  <SelectItem value="players">Nombre de joueurs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasSlots"
                  checked={filters.hasSlots}
                  onCheckedChange={(checked) => handleFilterChange({ hasSlots: checked })}
                />
                <Label htmlFor="hasSlots" className="text-sm">Places disponibles</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPrivate"
                  checked={filters.isPrivate}
                  onCheckedChange={(checked) => handleFilterChange({ isPrivate: checked })}
                />
                <Label htmlFor="isPrivate" className="text-sm">Lobbies privés</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className={cn(
          'grid gap-4',
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedLobbies.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500 mb-4">
              <h3 className="text-lg font-medium">Aucun lobby trouvé</h3>
              <p className="text-sm">
                {lobbies.length === 0 
                  ? "Il n'y a pas encore de lobbies créés."
                  : "Aucun lobby ne correspond à vos critères de recherche."
                }
              </p>
            </div>
            {onCreateLobby && (
              <Button onClick={onCreateLobby}>
                <Plus className="h-4 w-4 mr-2" />
                Créer le premier lobby
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lobbies Grid/List */}
      {!loading && sortedLobbies.length > 0 && (
        <div className={cn(
          'grid gap-4',
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        )}>
          {sortedLobbies.map((lobby) => (
            <LobbyCard
              key={lobby.uuid}
              lobby={lobby}
              currentUser={currentUser}
              variant={viewMode === 'list' ? 'compact' : 'detailed'}
              onJoin={onJoin}
              onLeave={onLeave}
              onView={onView}
              onShare={onShare}
              onStart={onStart}
              onKick={onKick}
              onSettings={onSettings}
            />
          ))}
        </div>
      )}

      {/* Results Summary */}
      {!loading && sortedLobbies.length > 0 && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Affichage de {sortedLobbies.length} lobby{sortedLobbies.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {sortedLobbies.filter(l => l.hasAvailableSlots).length} avec places libres
            </Badge>
            <Badge variant="outline">
              {sortedLobbies.filter(l => l.status === 'READY').length} prêts à jouer
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}
