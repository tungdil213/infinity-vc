import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { Input } from '@tyfo.dev/ui/primitives/input'
import { Textarea } from '@tyfo.dev/ui/primitives/textarea'
import { Label } from '@tyfo.dev/ui/primitives/label'
import { Checkbox } from '@tyfo.dev/ui/primitives/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tyfo.dev/ui/primitives/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tyfo.dev/ui/primitives/card'
import { Alert, AlertDescription } from '@tyfo.dev/ui/primitives/alert'
import { HeaderWrapper } from '../layouts/HeaderWrapper'
import Layout from '../layouts/layout'
import { AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react'

interface CreateLobbyProps {
  user: {
    uuid: string
    fullName: string
  }
  errors?: {
    name?: string[]
    maxPlayers?: string[]
    password?: string[]
    general?: string[]
  }
  flash?: {
    error?: string
    success?: string
  }
}

export default function CreateLobby({ user, errors = {}, flash = {} }: CreateLobbyProps) {
  const [formData, setFormData] = useState({
    name: '',
    maxPlayers: 4,
    isPrivate: false,
    hasPassword: false,
    password: '',
    description: '',
    gameType: 'love-letter',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const submitData = {
      ...formData,
      password: formData.hasPassword ? formData.password : undefined,
    }

    router.post('/lobbies', submitData, {
      onFinish: () => setIsLoading(false),
      onSuccess: () => {
        // Redirect will be handled by the server
      },
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }))
    } else if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  return (
    <Layout>
      <Head title="Create Lobby - Infinity Game" />

      <div className="min-h-screen bg-secondary-background">
        <HeaderWrapper user={{ uuid: user.uuid, fullName: user.fullName, email: '' }} />

        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Flash Messages */}
          {flash.error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{flash.error}</AlertDescription>
            </Alert>
          )}

          {flash.success && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{flash.success}</AlertDescription>
            </Alert>
          )}

          {/* Create Lobby Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create New Lobby</CardTitle>
              <CardDescription>
                Set up your gaming session and invite friends to play
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Lobby Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Lobby Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter a catchy lobby name"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your lobby or add any special rules..."
                  />
                </div>

                {/* Game Type */}
                <div className="space-y-2">
                  <Label>Game Type</Label>
                  <Select
                    value={formData.gameType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, gameType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a game" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="love-letter">Love Letter</SelectItem>
                      <SelectItem value="uno" disabled>
                        Uno (Coming Soon)
                      </SelectItem>
                      <SelectItem value="poker" disabled>
                        Poker (Coming Soon)
                      </SelectItem>
                      <SelectItem value="hearts" disabled>
                        Hearts (Coming Soon)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Players */}
                <div className="space-y-2">
                  <Label>Maximum Players</Label>
                  <Select
                    value={String(formData.maxPlayers)}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, maxPlayers: parseInt(value) }))
                    }
                  >
                    <SelectTrigger className={errors.maxPlayers ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select max players" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Players</SelectItem>
                      <SelectItem value="3">3 Players</SelectItem>
                      <SelectItem value="4">4 Players</SelectItem>
                      <SelectItem value="6">6 Players</SelectItem>
                      <SelectItem value="8">8 Players</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.maxPlayers && (
                    <p className="text-sm text-destructive">{errors.maxPlayers[0]}</p>
                  )}
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <Label className="text-base font-heading">Privacy Settings</Label>

                  {/* Private Lobby */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="isPrivate"
                      checked={formData.isPrivate}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isPrivate: !!checked }))
                      }
                    />
                    <div>
                      <Label htmlFor="isPrivate" className="cursor-pointer">
                        Private Lobby
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Only people with the invitation link can join
                      </p>
                    </div>
                  </div>

                  {/* Password Protection */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="hasPassword"
                      checked={formData.hasPassword}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, hasPassword: !!checked }))
                      }
                    />
                    <div>
                      <Label htmlFor="hasPassword" className="cursor-pointer">
                        Password Protection
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Require a password to join the lobby
                      </p>
                    </div>
                  </div>

                  {/* Password Field */}
                  {formData.hasPassword && (
                    <div className="ml-7 space-y-2">
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter lobby password"
                        className={errors.password ? 'border-destructive' : ''}
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password[0]}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* General Errors */}
                {errors.general && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.general[0]}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Creating Lobby...' : '🎮 Create Lobby'}
                  </Button>

                  <Link href="/lobbies" className="flex-1">
                    <Button variant="neutral" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tips */}
          <Alert className="mt-8">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Pro Tips:</strong> Choose a descriptive name to attract the right players.
              Private lobbies are great for playing with friends. You'll get a shareable invitation
              link after creating the lobby.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Layout>
  )
}
